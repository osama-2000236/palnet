import {
  EMPTY_EVIDENCE,
  type EvidenceSummary,
  SAFETY,
  type StandingInput,
  evidenceScore,
  standingFor,
} from "@baydar/shared";
import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

// Turning confirmed evidence into a rung and a score.
//
// Both numbers are CACHED, recomputed on write and never on read. A profile
// card that fanned out across five tables per person would make the craft
// directory unusable on the connection most of this market has.
//
// Rule 1: nothing in this file may read anything a member paid for.
// `check:ranking-purity` scans it — the file is named for what it measures
// rather than the surface it orders, so it is in the gate's explicit list. The
// gate matches the banned names in comments too, which is correct: a comment is
// how a name gets copied back into code.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class StandingService {
  private readonly logger = new Logger(StandingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recompute one member's standing on one occupation, and write it only if it
   * changed.
   *
   * Only on transition, so the "you advanced" notification has a real diff to
   * describe and a repeated recompute does not re-announce a rung somebody
   * reached last month.
   */
  async recompute(userId: string, occupationKey: string): Promise<number> {
    const input = await this.gatherStanding(userId, occupationKey);
    const value = standingFor(input);

    const existing = await this.prisma.standing.findUnique({
      where: { userId_occupationKey: { userId, occupationKey } },
    });

    // A suspended standing is not recomputed back up. Suspension is a decision
    // a human made about a report, and evidence arriving afterwards does not
    // overturn it — reinstatement is its own action.
    if (existing?.suspendedAt) return existing.value;

    if (!existing) {
      await this.prisma.standing.create({ data: { userId, occupationKey, value } });
      return value;
    }
    if (existing.value !== value) {
      await this.prisma.standing.update({
        where: { id: existing.id },
        // DEMOTED when evidence was withdrawn, EARNED when it was gained. The
        // ladder never decays with time; it only follows the evidence.
        data: { value, reason: value > existing.value ? "EARNED" : "DEMOTED" },
      });
      this.logger.log(`Standing ${userId}/${occupationKey}: ${existing.value} -> ${value}`);
    }
    return value;
  }

  /** Everything the ladder reads, in one place so the rule set has one input. */
  private async gatherStanding(userId: string, occupationKey: string): Promise<StandingInput> {
    const proofs = await this.prisma.workProof.findMany({
      where: { workerId: userId, occupationKey, status: "CONFIRMED" },
      select: {
        confirmedAt: true,
        clientUserId: true,
        clientCompanyId: true,
        clientPhoneHash: true,
      },
    });

    const counterparties = new Set(
      proofs.map((p) => p.clientUserId ?? p.clientCompanyId ?? p.clientPhoneHash ?? ""),
    );
    counterparties.delete("");

    const times = proofs
      .map((p) => p.confirmedAt?.getTime())
      .filter((t): t is number => typeof t === "number");
    const spanDays =
      times.length > 1 ? Math.floor((Math.max(...times) - Math.min(...times)) / MS_PER_DAY) : 0;

    return {
      confirmedProofs: proofs.length,
      distinctCounterparties: counterparties.size,
      spanDays,
      vouchesFromMasters: await this.countMasterVouches(userId, occupationKey),
      hasBodyRecommendation: await this.hasBodyRecommendation(userId, occupationKey),
    };
  }

  /**
   * Vouches from DISTINCT rung-4 holders in the same occupation.
   *
   * The voucher's own standing is checked here rather than trusted from when
   * the vouch was made: a sponsor who has since been suspended should stop
   * carrying somebody else up the ladder.
   */
  private async countMasterVouches(userId: string, occupationKey: string): Promise<number> {
    const vouches = await this.prisma.vouch.findMany({
      where: { voucheeId: userId, occupationKey, revokedAt: null },
      select: { voucherId: true },
    });
    if (vouches.length === 0) return 0;

    const masters = await this.prisma.standing.count({
      where: {
        userId: { in: vouches.map((v) => v.voucherId) },
        occupationKey,
        value: 4,
        suspendedAt: null,
      },
    });
    return masters;
  }

  private async hasBodyRecommendation(userId: string, occupationKey: string): Promise<boolean> {
    const count = await this.prisma.recommendation.count({
      where: {
        subjectId: userId,
        occupationKey,
        status: "PUBLISHED",
        hiddenBySubject: false,
        author: { verifications: { some: { method: "PROFESSIONAL_BODY", status: "VERIFIED" } } },
      },
    });
    return count > 0;
  }

  /**
   * The full evidence picture for one member, and the cached score derived
   * from it.
   *
   * `standing` picks the member's best rung across occupations, because the
   * score is one number about one person and a plumber who is also a novice
   * carpenter should not be averaged down for it.
   */
  async summaryFor(userId: string): Promise<EvidenceSummary> {
    const [proofs, standing, licence, recommendations, verifications, ratings] = await Promise.all([
      this.prisma.workProof.findMany({
        where: { workerId: userId, status: "CONFIRMED" },
        select: { clientUserId: true, clientCompanyId: true, clientPhoneHash: true },
      }),
      this.prisma.standing.findFirst({
        where: { userId, suspendedAt: null },
        orderBy: { value: "desc" },
        select: { occupationKey: true, value: true },
      }),
      this.prisma.licence.findFirst({
        where: { userId },
        orderBy: { status: "asc" },
        select: { bodyKey: true, status: true, practice: true },
      }),
      this.prisma.recommendation.count({
        where: { subjectId: userId, status: "PUBLISHED", hiddenBySubject: false },
      }),
      this.prisma.verification.findMany({
        where: { userId, status: "VERIFIED" },
        select: { method: true },
      }),
      this.prisma.userRating.aggregate({
        where: { rateeId: userId },
        _avg: { score: true },
        _count: true,
      }),
    ]);

    const counterparties = new Set(
      proofs.map((p) => p.clientUserId ?? p.clientCompanyId ?? p.clientPhoneHash ?? ""),
    );
    counterparties.delete("");

    const ratingCount = ratings._count;
    return {
      ...EMPTY_EVIDENCE,
      confirmedWorkProofs: proofs.length,
      distinctCounterparties: counterparties.size,
      standing,
      licence,
      recommendations,
      verifications: verifications.map((v) => v.method) as EvidenceSummary["verifications"],
      // Below the floor the average is withheld and only the count is shown.
      // §16.5: a single retaliatory one-star must not define somebody.
      ratingAvg:
        ratingCount >= SAFETY.MIN_RATINGS_FOR_AVERAGE ? (ratings._avg.score ?? null) : null,
      ratingCount,
    };
  }

  /**
   * Recompute and cache `Profile.evidenceScore`.
   *
   * Called from every write that could move it — a confirmed proof, a published
   * recommendation, a verification, a licence. Never from a read.
   */
  async recomputeScore(userId: string): Promise<number> {
    const summary = await this.summaryFor(userId);
    const score = evidenceScore(summary);
    await this.prisma.profile.updateMany({ where: { userId }, data: { evidenceScore: score } });
    return score;
  }
}
