import {
  type ConfirmWorkProofBody,
  type CreateWorkProofBody,
  type DisputeWorkProofBody,
  ErrorCode,
  type MyWorkProofsQuery,
  WORK_PROOF_CONFIRM_WINDOW_DAYS,
  type WorkProof,
  isSelfConfirmation,
} from "@baydar/shared";
import { Inject, Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";
import { SMS_TRANSPORT, type SmsTransport } from "../sms/sms.transport";
import { OtpService, hashPhone } from "../verifications/otp.service";

import { StandingService } from "./standing.service";
import { toWorkProofDto, workProofInclude } from "./work-proofs.mapper";

// The evidence loop.
//
// A worker files what they did and who it was for; that counterparty says yes
// or no. Nothing else on the craft track moves without this, which is why every
// shortcut around it has to be closed:
//
//   - the worker may never be the counterparty (`isSelfConfirmation`)
//   - the same client cannot be filed twice for the same occupation on the
//     off-platform path (partial unique index in migration 202608090011)
//   - an unanswered request expires rather than sitting as leverage
//   - a confirmed proof can be disputed, never deleted, so a disagreement about
//     an invoice cannot erase somebody's work history

@Injectable()
export class WorkProofsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly standing: StandingService,
    private readonly otp: OtpService,
    @Inject(SMS_TRANSPORT) private readonly sms: SmsTransport,
  ) {}

  async create(workerId: string, body: CreateWorkProofBody): Promise<WorkProof> {
    if (isSelfConfirmation(workerId, body.clientUserId ?? null)) {
      throw new DomainException(
        ErrorCode.WORK_PROOF_SELF_CONFIRM,
        "You cannot confirm your own work.",
        400,
      );
    }

    const clientPhoneHash = body.clientPhoneE164 ? hashPhone(body.clientPhoneE164) : null;
    if (clientPhoneHash) await this.assertPhoneVerified(workerId);

    const confirmExpiresAt = new Date(
      Date.now() + WORK_PROOF_CONFIRM_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    let row;
    try {
      row = await this.prisma.workProof.create({
        data: {
          workerId,
          clientUserId: body.clientUserId ?? null,
          clientCompanyId: body.clientCompanyId ?? null,
          clientPhoneHash,
          occupationKey: body.occupationKey,
          jobId: body.jobId ?? null,
          applicationId: body.applicationId ?? null,
          city: body.city ?? null,
          summary: body.summary ?? null,
          completedAt: new Date(body.completedAt),
          confirmExpiresAt,
        },
        include: workProofInclude,
      });
    } catch {
      // Either unique index: one proof per application, or one per
      // (worker, occupation, client phone) off-platform.
      throw new DomainException(ErrorCode.WORK_PROOF_DUPLICATE, "That work is already filed.", 409);
    }

    if (body.clientPhoneE164) {
      const { code } = await this.otp.issue(body.clientPhoneE164, "WORK_PROOF_CONFIRM", row.id);
      await this.sms.send(
        body.clientPhoneE164,
        `${code} — رمز تأكيد العمل في بيدر. أدخله فقط إذا أنجز هذا الشخص عملًا لك.`,
      );
    }

    return toWorkProofDto(row);
  }

  /**
   * Confirm. Two doors, one lock.
   *
   * An authenticated counterparty is checked against the row. An off-platform
   * one has no session, so the SMS code IS the authorisation — single-use,
   * ten-minute, five-attempt, and bound to this proof's id by `refId`.
   */
  async confirm(
    proofId: string,
    body: ConfirmWorkProofBody,
    actorId: string | null,
  ): Promise<WorkProof> {
    const row = await this.prisma.workProof.findUnique({
      where: { id: proofId },
      include: workProofInclude,
    });
    if (!row) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    this.assertPending(row.status, row.confirmExpiresAt);

    if (row.clientPhoneHash) {
      if (!body.code) {
        throw new DomainException(ErrorCode.OTP_INVALID, "A code is required.", 400);
      }
      // The code carries the number it was sent to, so the lookup is by hash
      // rather than by anything the caller supplied.
      const phone = await this.phoneForProof(proofId);
      const { refId } = await this.otp.consume(phone, "WORK_PROOF_CONFIRM", body.code);
      if (refId !== proofId) {
        throw new DomainException(ErrorCode.OTP_INVALID, "That code is not valid.", 400);
      }
    } else {
      await this.assertIsCounterparty(row, actorId);
    }

    const confirmed = await this.prisma.workProof.update({
      where: { id: proofId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
      include: workProofInclude,
    });

    await this.standing.recompute(row.workerId, row.occupationKey);
    await this.standing.recomputeScore(row.workerId);

    return toWorkProofDto(confirmed);
  }

  async decline(proofId: string, actorId: string): Promise<WorkProof> {
    const row = await this.prisma.workProof.findUnique({
      where: { id: proofId },
      include: workProofInclude,
    });
    if (!row) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    this.assertPending(row.status, row.confirmExpiresAt);
    await this.assertIsCounterparty(row, actorId);

    const declined = await this.prisma.workProof.update({
      where: { id: proofId },
      data: { status: "DECLINED" },
      include: workProofInclude,
    });
    return toWorkProofDto(declined);
  }

  /**
   * Dispute a confirmed proof.
   *
   * DISPUTED, not deleted: the row stops counting toward a standing but stays
   * visible to a moderator. Deletion would let either party erase the record in
   * an argument about the last invoice, and the record is the point.
   */
  async dispute(proofId: string, actorId: string, body: DisputeWorkProofBody): Promise<WorkProof> {
    const row = await this.prisma.workProof.findUnique({
      where: { id: proofId },
      include: workProofInclude,
    });
    if (!row) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);

    const isParty = row.workerId === actorId || row.clientUserId === actorId;
    if (!isParty) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);

    const disputed = await this.prisma.workProof.update({
      where: { id: proofId },
      data: { status: "DISPUTED", summary: row.summary ?? body.reason.slice(0, 2000) },
      include: workProofInclude,
    });

    // The rung follows the evidence in both directions. Somebody who reached
    // rung 3 on twelve proofs and loses one may fall back to 2, and that is the
    // ladder working rather than a punishment.
    await this.standing.recompute(row.workerId, row.occupationKey);
    await this.standing.recomputeScore(row.workerId);

    return toWorkProofDto(disputed);
  }

  async listMine(userId: string, query: MyWorkProofsQuery): Promise<WorkProof[]> {
    const rows = await this.prisma.workProof.findMany({
      where: {
        ...(query.role === "worker" ? { workerId: userId } : { clientUserId: userId }),
        ...(query.status ? { status: query.status } : {}),
      },
      include: workProofInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(toWorkProofDto);
  }

  /**
   * Lapse every request nobody answered.
   *
   * Run from the cron sweep. An open request is a small piece of social
   * pressure on a client who already said no by saying nothing.
   */
  async expireStale(): Promise<number> {
    const { count } = await this.prisma.workProof.updateMany({
      where: { status: "PENDING", confirmExpiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return count;
  }

  private assertPending(status: string, confirmExpiresAt: Date | null): void {
    if (status !== "PENDING" || (confirmExpiresAt && confirmExpiresAt.getTime() < Date.now())) {
      throw new DomainException(
        ErrorCode.WORK_PROOF_NOT_PENDING,
        "That request is no longer open.",
        409,
      );
    }
  }

  private async assertIsCounterparty(
    row: { clientUserId: string | null; clientCompanyId: string | null },
    actorId: string | null,
  ): Promise<void> {
    if (!actorId) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    if (row.clientUserId && row.clientUserId === actorId) return;
    if (row.clientCompanyId) {
      const isAdmin = await this.prisma.companyMember.count({
        where: {
          companyId: row.clientCompanyId,
          userId: actorId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });
      if (isAdmin > 0) return;
    }
    // 404 rather than 403: whether a proof exists is not something a stranger
    // gets to learn by guessing ids.
    throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
  }

  /**
   * A worker must have verified their own phone before naming somebody else's.
   *
   * Otherwise the off-platform path is a free SMS gun pointed at any number,
   * paid for by Baydar and attributable to nobody.
   */
  private async assertPhoneVerified(workerId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: workerId },
      select: { phoneVerifiedAt: true },
    });
    if (!user?.phoneVerifiedAt) {
      throw new DomainException(
        ErrorCode.VERIFICATION_DOMAIN_UNKNOWN,
        "Verify your own phone number first.",
        400,
      );
    }
  }

  /** The number an off-platform code went to, found through the OTP row. */
  private async phoneForProof(proofId: string): Promise<string> {
    const otpRow = await this.prisma.phoneOtp.findFirst({
      where: { purpose: "WORK_PROOF_CONFIRM", refId: proofId, consumedAt: null },
      orderBy: { createdAt: "desc" },
      select: { phoneE164: true },
    });
    if (!otpRow) throw new DomainException(ErrorCode.OTP_EXPIRED, "That code has expired.", 400);
    return otpRow.phoneE164;
  }
}
