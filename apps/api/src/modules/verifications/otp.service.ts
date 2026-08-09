import { ErrorCode, OTP_LIMITS, type OtpPurpose } from "@baydar/shared";
import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

// One-time codes, and the rules that make them worth anything.
//
// A six-digit code is a 20-bit secret. Everything that makes it safe is around
// it rather than in it: it expires in ten minutes, it can be wrong five times
// before the row burns, it is single-use, and only a handful can be requested
// per hour. Remove any one of those and the code is guessable.
//
// The plaintext code is never stored. A leaked table of live OTPs is a leaked
// table of accounts, and hashing costs one line.

/** Codes are compared as hashes, so a plain `===` here is already constant-length. */
function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Public so the work-proof loop can hash a client's number the same way. */
export function hashPhone(e164: string): string {
  return createHash("sha256").update(e164).digest("hex");
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mint a code and hand back when it expires.
   *
   * Returns the plaintext exactly once, to the caller that will send it. It is
   * never returned to a client, never logged in production, and never read back
   * from the database because it is not there.
   */
  async issue(
    phoneE164: string,
    purpose: OtpPurpose,
    refId: string | null = null,
  ): Promise<{ code: string; expiresAt: Date; resendAfter: Date }> {
    await this.assertNotFlooding(phoneE164, purpose);

    // `randomInt` rather than Math.random: this is a credential, and a
    // predictable PRNG makes the other four controls decorative.
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const now = Date.now();
    const expiresAt = new Date(now + OTP_LIMITS.CODE_TTL_MINUTES * 60 * 1000);

    // Any live code for this number and purpose is spent. Two valid codes at
    // once doubles an attacker's chances and confuses the member about which
    // SMS to read.
    await this.prisma.phoneOtp.updateMany({
      where: { phoneE164, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });

    await this.prisma.phoneOtp.create({
      data: { phoneE164, codeHash: hashCode(code), purpose, refId, expiresAt },
    });

    return {
      code,
      expiresAt,
      resendAfter: new Date(now + OTP_LIMITS.RESEND_COOLDOWN_SECONDS * 1000),
    };
  }

  /**
   * Spend a code. Returns the row's `refId` so the caller knows what was
   * confirmed; throws on every failure mode rather than returning false.
   *
   * A wrong code increments `attempts` on the row. At the limit the row is
   * consumed — burnt, not merely rejected — so an attacker cannot keep guessing
   * against the same secret by starting fresh requests.
   */
  async consume(
    phoneE164: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<{ refId: string | null }> {
    const row = await this.prisma.phoneOtp.findFirst({
      where: { phoneE164, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!row) {
      throw new DomainException(ErrorCode.OTP_INVALID, "That code is not valid.", 400);
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new DomainException(ErrorCode.OTP_EXPIRED, "That code has expired.", 400);
    }
    if (row.attempts >= OTP_LIMITS.MAX_CONFIRM_ATTEMPTS) {
      await this.burn(row.id);
      throw new DomainException(
        ErrorCode.OTP_ATTEMPTS_EXHAUSTED,
        "Too many attempts. Request a new code.",
        400,
      );
    }

    if (!this.matches(row.codeHash, code)) {
      const attempts = row.attempts + 1;
      if (attempts >= OTP_LIMITS.MAX_CONFIRM_ATTEMPTS) {
        await this.burn(row.id);
        throw new DomainException(
          ErrorCode.OTP_ATTEMPTS_EXHAUSTED,
          "Too many attempts. Request a new code.",
          400,
        );
      }
      await this.prisma.phoneOtp.update({ where: { id: row.id }, data: { attempts } });
      throw new DomainException(ErrorCode.OTP_INVALID, "That code is not valid.", 400);
    }

    // Single-use, enforced by a conditional update rather than a read-then-write:
    // two confirms racing on the same code must not both succeed.
    const { count } = await this.prisma.phoneOtp.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: new Date(), attempts: row.attempts + 1 },
    });
    if (count === 0) {
      throw new DomainException(ErrorCode.OTP_INVALID, "That code is not valid.", 400);
    }

    return { refId: row.refId };
  }

  private matches(storedHash: string, code: string): boolean {
    const a = Buffer.from(storedHash, "hex");
    const b = Buffer.from(hashCode(code), "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private async burn(id: string): Promise<void> {
    await this.prisma.phoneOtp.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date(), attempts: OTP_LIMITS.MAX_CONFIRM_ATTEMPTS },
    });
  }

  /**
   * Per-number daily cap.
   *
   * The per-user hourly cap is the `otpStart` rate-limit bucket on the route.
   * This one is per NUMBER, which is the axis a rotating set of accounts would
   * otherwise walk around — and every SMS costs money whether or not it is
   * fraud.
   */
  private async assertNotFlooding(phoneE164: string, purpose: OtpPurpose): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = await this.prisma.phoneOtp.count({
      where: { phoneE164, purpose, createdAt: { gte: since } },
    });
    if (today >= OTP_LIMITS.START_PER_DAY_PER_PHONE) {
      throw new DomainException(
        ErrorCode.RATE_LIMITED,
        "Too many codes sent to that number today.",
        429,
      );
    }
  }

  /**
   * Delete spent and expired rows.
   *
   * Called from the same sweep that clears idempotency records. Codes are
   * short-lived by design and keeping the corpses is a small, pointless liability.
   */
  async sweep(): Promise<number> {
    const { count } = await this.prisma.phoneOtp.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (count > 0) this.logger.log(`Swept ${count} expired OTP row(s).`);
    return count;
  }
}
