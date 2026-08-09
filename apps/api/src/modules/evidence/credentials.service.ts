import {
  type ClaimOccupationBody,
  type CreateLicenceBody,
  type CreateVouchBody,
  ErrorCode,
  type Licence,
  VOUCH_ACTIVE_CAP,
  type Vouch,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { StandingService } from "./standing.service";

// The three writes that are not a work proof: claiming an occupation, being
// sponsored onto the ladder, and declaring a statutory licence.

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

@Injectable()
export class CredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly standing: StandingService,
  ) {}

  // ──────────────── Occupation claims ────────────────

  /**
   * Claim an occupation. Free, instant, and worth nothing on its own — it
   * renders as «مهنة معلنة», rung 1, until somebody else confirms work.
   *
   * Free on purpose: a member who cannot name their trade cannot be found by
   * anybody looking for it, and gating the claim would gate discovery rather
   * than gate the credential.
   */
  async claim(userId: string, body: ClaimOccupationBody): Promise<void> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new DomainException(
        ErrorCode.PROFILE_ONBOARDING_REQUIRED,
        "Complete your profile first.",
        400,
      );
    }

    // One primary at a time: the primary claim is what the person card and the
    // profile-view breakdown read, and two would make both ambiguous.
    if (body.isPrimary) {
      await this.prisma.occupationClaim.updateMany({
        where: { profileId: profile.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    await this.prisma.occupationClaim.upsert({
      where: {
        profileId_occupationKey: { profileId: profile.id, occupationKey: body.occupationKey },
      },
      create: {
        profileId: profile.id,
        occupationKey: body.occupationKey,
        declaredYears: body.declaredYears ?? null,
        isPrimary: body.isPrimary ?? false,
      },
      update: {
        declaredYears: body.declaredYears ?? null,
        isPrimary: body.isPrimary ?? false,
      },
    });

    // Rung 1 exists the moment the claim does, so the profile has something
    // honest to render rather than an empty standing slot.
    await this.standing.recompute(userId, body.occupationKey);
  }

  async unclaim(userId: string, occupationKey: string): Promise<void> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return;
    await this.prisma.occupationClaim.deleteMany({
      where: { profileId: profile.id, occupationKey },
    });
  }

  // ──────────────── Vouches ────────────────

  /**
   * Sponsor somebody onto the ladder.
   *
   * Three gates, and each closes a different way this becomes a favour economy:
   * only a rung-4 holder in the same occupation may vouch; nobody may hold more
   * than five active vouches at once; and a voucher whose vouchee lost a dispute
   * is suspended from vouching for a window.
   */
  async vouch(voucherId: string, body: CreateVouchBody): Promise<Vouch> {
    if (voucherId === body.voucheeId) {
      throw new DomainException(
        ErrorCode.VOUCH_NOT_ELIGIBLE,
        "You cannot vouch for yourself.",
        400,
      );
    }

    const voucher = await this.prisma.user.findUnique({
      where: { id: voucherId },
      select: { vouchSuspendedUntil: true },
    });
    if (voucher?.vouchSuspendedUntil && voucher.vouchSuspendedUntil > new Date()) {
      throw new DomainException(
        ErrorCode.VOUCH_SUSPENDED,
        "Your vouching is suspended pending review.",
        403,
      );
    }

    const standing = await this.prisma.standing.findUnique({
      where: { userId_occupationKey: { userId: voucherId, occupationKey: body.occupationKey } },
    });
    if (!standing || standing.suspendedAt || standing.value < 4) {
      throw new DomainException(
        ErrorCode.VOUCH_NOT_ELIGIBLE,
        "Only a معلّم in this trade may vouch.",
        403,
      );
    }

    const active = await this.prisma.vouch.count({
      where: { voucherId, revokedAt: null },
    });
    if (active >= VOUCH_ACTIVE_CAP) {
      throw new DomainException(
        ErrorCode.VOUCH_CAP_REACHED,
        "You are already vouching for the maximum number of people.",
        409,
      );
    }

    const row = await this.prisma.vouch.upsert({
      where: {
        voucherId_voucheeId_occupationKey: {
          voucherId,
          voucheeId: body.voucheeId,
          occupationKey: body.occupationKey,
        },
      },
      create: {
        voucherId,
        voucheeId: body.voucheeId,
        occupationKey: body.occupationKey,
        note: body.note ?? null,
      },
      update: { note: body.note ?? null, revokedAt: null },
    });

    await this.standing.recompute(body.voucheeId, body.occupationKey);

    return {
      id: row.id,
      voucherId: row.voucherId,
      voucheeId: row.voucheeId,
      occupationKey: row.occupationKey,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Withdrawing a vouch is a soft revoke — the row stays for the audit trail. */
  async revokeVouch(voucherId: string, id: string): Promise<void> {
    const row = await this.prisma.vouch.findFirst({ where: { id, voucherId } });
    if (!row) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    await this.prisma.vouch.update({ where: { id }, data: { revokedAt: new Date() } });
    await this.standing.recompute(row.voucheeId, row.occupationKey);
  }

  // ──────────────── Licences ────────────────

  /**
   * Declare a statutory licence. Always DECLARED, never VERIFIED.
   *
   * Baydar verifies licences; it never invents a rank beside a نقابة, and no
   * client may post one that already claims to have been checked.
   */
  async addLicence(userId: string, body: CreateLicenceBody): Promise<Licence> {
    try {
      const row = await this.prisma.licence.create({
        data: {
          userId: body.companyId ? null : userId,
          companyId: body.companyId ?? null,
          occupationKey: body.occupationKey,
          bodyKey: body.bodyKey,
          number: body.number ?? null,
          status: "DECLARED",
          issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        },
      });
      await this.standing.recomputeScore(userId);
      return this.toLicenceDto(row);
    } catch {
      throw new DomainException(
        ErrorCode.LICENCE_DUPLICATE,
        "That licence is already on your profile.",
        409,
      );
    }
  }

  /** Ask a human to check it. The status does not move until one does. */
  async requestLicenceVerification(userId: string, id: string): Promise<Licence> {
    const row = await this.prisma.licence.findFirst({ where: { id, userId } });
    if (!row) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    await this.prisma.verification.upsert({
      where: { userId_method: { userId, method: "PROFESSIONAL_BODY" } },
      create: {
        userId,
        method: "PROFESSIONAL_BODY",
        status: "PENDING",
        evidenceRef: `${row.bodyKey}:${row.occupationKey}:${row.number ?? ""}`,
      },
      update: { status: "PENDING" },
    });
    return this.toLicenceDto(row);
  }

  async removeLicence(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.licence.deleteMany({ where: { id, userId } });
    if (count === 0) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    await this.standing.recomputeScore(userId);
  }

  private toLicenceDto(row: {
    id: string;
    occupationKey: string;
    bodyKey: string;
    number: string | null;
    status: Licence["status"];
    practice: Licence["practice"];
    issuedAt: Date | null;
    expiresAt: Date | null;
    verifiedAt: Date | null;
  }): Licence {
    return {
      id: row.id,
      occupationKey: row.occupationKey,
      bodyKey: row.bodyKey,
      number: row.number,
      status: row.status,
      practice: row.practice,
      issuedAt: iso(row.issuedAt),
      expiresAt: iso(row.expiresAt),
      verifiedAt: iso(row.verifiedAt),
    };
  }
}
