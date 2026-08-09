import {
  type ConfirmEmailDomainVerificationBody,
  type ConfirmPhoneVerificationBody,
  EMAIL_VERIFICATION_TTL_HOURS,
  ErrorCode,
  type EmailDomainChallenge,
  type MyVerifications,
  type OtpChallenge,
  type RequestBodyVerificationBody,
  type StartEmailDomainVerificationBody,
  type StartPhoneVerificationBody,
  type VerificationState,
  phoneTail,
  universityForEmail,
} from "@baydar/shared";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import type { MailTransport } from "../mail/console-mail.transport";
import { MAIL_TRANSPORT } from "../mail/mail.tokens";
import { PrismaService } from "../prisma/prisma.service";
import { SMS_TRANSPORT, type SmsTransport } from "../sms/sms.transport";

import { OtpService } from "./otp.service";

// Four checks, each of which says one specific thing.
//
// PHONE — this account can receive SMS at this number.
// WORK_EMAIL — this account reads mail at this employer's domain.
// EDU_EMAIL — the same, at an institution from the table.
// PROFESSIONAL_BODY — a human compared a membership number to a register.
//
// None of them is a blue tick and the UI never renders one. Every badge names
// its method, because a generic "verified" mark makes a promise Baydar cannot
// keep and the word معتمد is banned for the same reason.

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

@Injectable()
export class VerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly config: ConfigService<Env, true>,
    @Inject(SMS_TRANSPORT) private readonly sms: SmsTransport,
    @Inject(MAIL_TRANSPORT) private readonly mail: MailTransport,
  ) {}

  async listMine(userId: string): Promise<MyVerifications> {
    const rows = await this.prisma.verification.findMany({ where: { userId } });
    return { verifications: rows.map((row) => this.toState(row)) };
  }

  // ──────────────── Phone ────────────────

  async startPhone(userId: string, body: StartPhoneVerificationBody): Promise<OtpChallenge> {
    await this.assertNotAlreadyVerified(userId, "PHONE", body.phoneE164);

    const { code, expiresAt, resendAfter } = await this.otp.issue(body.phoneE164, "PHONE_VERIFY");
    await this.sms.send(body.phoneE164, `${code} — رمز التحقق في بيدر. لا تشاركه مع أحد.`);

    // The row goes to PENDING now so a member who abandons halfway sees an
    // honest state rather than nothing.
    await this.upsert(userId, "PHONE", body.phoneE164, "PENDING");

    return {
      phoneTail: phoneTail(body.phoneE164),
      expiresAt: expiresAt.toISOString(),
      resendAfter: resendAfter.toISOString(),
    };
  }

  async confirmPhone(
    userId: string,
    body: ConfirmPhoneVerificationBody,
  ): Promise<VerificationState> {
    await this.otp.consume(body.phoneE164, "PHONE_VERIFY", body.code);

    const verifiedAt = new Date();
    const row = await this.upsert(userId, "PHONE", body.phoneE164, "VERIFIED", verifiedAt);

    // Denormalised so the hot check — "may this account file an off-platform
    // work proof" — is one column rather than a join on every write.
    await this.prisma.user.update({ where: { id: userId }, data: { phoneVerifiedAt: verifiedAt } });

    return this.toState(row);
  }

  // ──────────────── Work and university email ────────────────

  /**
   * One endpoint for both email methods; the domain decides which.
   *
   * Letting the client declare the method would let it declare wrong, and
   * EDU_EMAIL is the more valuable badge.
   */
  async startEmailDomain(
    userId: string,
    body: StartEmailDomainVerificationBody,
  ): Promise<EmailDomainChallenge> {
    const email = body.email.trim().toLowerCase();
    const domain = email.slice(email.lastIndexOf("@") + 1);
    if (!domain) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Invalid address.", 400);
    }

    const university = universityForEmail(email);
    const method = university ? "EDU_EMAIL" : "WORK_EMAIL";
    await this.assertNotAlreadyVerified(userId, method, domain);

    // The token is the credential. Stored as a hash for the same reason the OTP
    // is: a leaked table of live tokens is a leaked table of badges.
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.verification.upsert({
      where: { userId_method: { userId, method } },
      create: {
        userId,
        method,
        status: "PENDING",
        evidenceRef: `${domain}:${hashToken(token)}`,
        expiresAt,
      },
      update: {
        status: "PENDING",
        evidenceRef: `${domain}:${hashToken(token)}`,
        expiresAt,
        verifiedAt: null,
      },
    });

    const base = this.config.get<string>("BAYDAR_WEB_URL") ?? "http://localhost:3000";
    await this.mail.send("verify-domain", email, {
      url: `${base}/settings/verification?token=${token}`,
    });

    return { method, domain, expiresAt: expiresAt.toISOString() };
  }

  async confirmEmailDomain(
    userId: string,
    body: ConfirmEmailDomainVerificationBody,
  ): Promise<VerificationState> {
    const suffix = `:${hashToken(body.token)}`;
    const row = await this.prisma.verification.findFirst({
      where: {
        userId,
        status: "PENDING",
        evidenceRef: { endsWith: suffix },
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) {
      throw new DomainException(ErrorCode.OTP_INVALID, "That link is not valid.", 400);
    }

    // The hash is dropped on success: the domain is the evidence worth keeping,
    // and a spent token is a liability with no remaining use.
    const domain = row.evidenceRef.slice(0, row.evidenceRef.length - suffix.length);
    const updated = await this.prisma.verification.update({
      where: { id: row.id },
      data: { status: "VERIFIED", verifiedAt: new Date(), evidenceRef: domain, expiresAt: null },
    });
    return this.toState(updated);
  }

  // ──────────────── Professional body ────────────────

  /**
   * The manual path. Queued PENDING for a human.
   *
   * Deliberately slow: نقابة registers are not APIs, and an automated
   * "verification" that checks nothing would be the most damaging badge on the
   * platform — it is the one an employer would actually rely on.
   */
  async requestBody(userId: string, body: RequestBodyVerificationBody): Promise<VerificationState> {
    await this.assertNotAlreadyVerified(userId, "PROFESSIONAL_BODY", body.bodyKey);
    const row = await this.upsert(
      userId,
      "PROFESSIONAL_BODY",
      `${body.bodyKey}:${body.occupationKey}:${body.membershipNumber}`,
      "PENDING",
    );
    return this.toState(row);
  }

  // ──────────────── Shared ────────────────

  private async upsert(
    userId: string,
    method: VerificationState["method"],
    evidenceRef: string,
    status: VerificationState["status"],
    verifiedAt: Date | null = null,
  ) {
    return this.prisma.verification.upsert({
      where: { userId_method: { userId, method } },
      create: { userId, method, evidenceRef, status, verifiedAt },
      update: { evidenceRef, status, verifiedAt },
    });
  }

  /**
   * Re-verifying the same credential is a no-op worth refusing, so the member
   * gets told rather than silently spending an SMS. A DIFFERENT credential is
   * allowed — people change employers and phone numbers.
   */
  private async assertNotAlreadyVerified(
    userId: string,
    method: VerificationState["method"],
    evidencePrefix: string,
  ): Promise<void> {
    const existing = await this.prisma.verification.findUnique({
      where: { userId_method: { userId, method } },
    });
    if (existing?.status === "VERIFIED" && existing.evidenceRef.startsWith(evidencePrefix)) {
      throw new DomainException(
        ErrorCode.VERIFICATION_ALREADY_VERIFIED,
        "That is already verified.",
        409,
      );
    }
  }

  /**
   * The wire shape. Never leaks the credential itself: a phone becomes its last
   * four digits, an email becomes its domain, and a pending token never appears
   * at all.
   */
  private toState(row: {
    method: string;
    status: string;
    evidenceRef: string;
    verifiedAt: Date | null;
    expiresAt: Date | null;
  }): VerificationState {
    const method = row.method as VerificationState["method"];
    const ref = row.evidenceRef.split(":")[0] ?? "";
    return {
      method,
      status: row.status as VerificationState["status"],
      evidenceLabel: method === "PHONE" ? phoneTail(ref) : ref || null,
      verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    };
  }
}
