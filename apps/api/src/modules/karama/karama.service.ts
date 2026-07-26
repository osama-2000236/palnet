import {
  type KaramaBalance,
  type KaramaLedgerEntry,
  type KaramaReason,
  type KaramaRedeemResult,
  KaramaReward,
  type RedeemKaramaBody,
  ErrorCode,
} from "@baydar/shared";
import { Injectable, Logger } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { USER_PREMIUM_POINTS_PRICE } from "../billing/pricing";
import { PrismaService } from "../prisma/prisma.service";

export const KARAMA_BALANCE_CAP = 5000;
export const KARAMA_DECAY_RATE = 0.01;
export const KARAMA_DECAY_INACTIVITY_MS = 60 * 24 * 60 * 60 * 1000;
export const KARAMA_DECAY_REF_TYPE = "monthly-inactivity-decay";

export const KARAMA_EARN: Record<KaramaReason, number> = {
  PROFILE_COMPLETE: 50,
  ENDORSEMENT: 5,
  VERIFIED_HIRE: 200,
  RATING_RECEIVED: 30,
  REPORT_UPHELD: 20,
  FIRST_POST: 15,
  REDEEM_BOOST_APPLICATION: -100,
  REDEEM_PREMIUM: -500,
  REDEEM_FEATURED_PROFILE: -1000,
  DECAY: 0,
  ADJUSTMENT: 0,
};

const REDEEM_COSTS: Record<KaramaReward, { reason: KaramaReason; cost: number }> = {
  BOOST_APPLICATION: { reason: "REDEEM_BOOST_APPLICATION", cost: 100 },
  PREMIUM_30D: { reason: "REDEEM_PREMIUM", cost: USER_PREMIUM_POINTS_PRICE },
  FEATURED_PROFILE_7D: { reason: "REDEEM_FEATURED_PROFILE", cost: 1000 },
};

export interface AwardInput {
  userId: string;
  reason: KaramaReason;
  delta?: number;
  refType?: string | null;
  refId?: string | null;
}

export interface KaramaDecayReport {
  scannedAt: string;
  cutoff: string;
  period: string;
  dryRun: boolean;
  scannedCount: number;
  decayedCount: number;
  skippedAlreadyDecayedCount: number;
  totalDelta: number;
  decayedUserIds: string[];
}

@Injectable()
export class KaramaService {
  private readonly log = new Logger(KaramaService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ───── Public read ─────

  async getBalance(userId: string): Promise<KaramaBalance> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { karamaBalance: true },
    });
    const balance = user?.karamaBalance ?? 0;
    const recent = await this.prisma.karamaLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return {
      balance,
      cap: KARAMA_BALANCE_CAP,
      recent: recent.map(toLedgerDto),
    };
  }

  // ───── Earn (called by other modules) ─────

  async award(input: AwardInput): Promise<void> {
    const desiredDelta = input.delta ?? KARAMA_EARN[input.reason];
    if (desiredDelta === 0) return;
    try {
      await this.applyDelta(input.userId, desiredDelta, input.reason, {
        refType: input.refType ?? null,
        refId: input.refId ?? null,
        clampToCap: desiredDelta > 0,
      });
    } catch (err) {
      this.log.warn(
        `Award failed (user=${input.userId} reason=${input.reason}): ${(err as Error).message}`,
      );
    }
  }

  // Idempotent variant for one-time earns (PROFILE_COMPLETE, FIRST_POST, etc.)
  // and capped earns (ENDORSEMENT). The database unique constraint on
  // (userId, reason, refType, refId) is the source of truth, so duplicate
  // concurrent fires roll back cleanly instead of racing a read-before-write.
  async awardOnce(input: AwardInput & { refType: string; refId: string }): Promise<boolean> {
    const desiredDelta = input.delta ?? KARAMA_EARN[input.reason];
    try {
      await this.applyDelta(input.userId, desiredDelta, input.reason, {
        refType: input.refType,
        refId: input.refId,
        clampToCap: desiredDelta > 0,
      });
      return true;
    } catch (err) {
      if (isUniqueConstraintViolation(err)) return false;
      this.log.warn(
        `Award-once failed (user=${input.userId} reason=${input.reason} ref=${input.refType}:${input.refId}): ${
          (err as Error).message
        }`,
      );
      return false;
    }
  }

  // Returns the absolute sum of positive ledger deltas for a single reason in
  // the current UTC month. Used by ENDORSEMENT to enforce the +200/month cap.
  async getMonthlyEarnings(
    userId: string,
    reason: KaramaReason,
    now: Date = new Date(),
  ): Promise<number> {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const rows = await this.prisma.karamaLedger.findMany({
      where: {
        userId,
        reason,
        createdAt: { gte: start, lt: end },
        delta: { gt: 0 },
      },
      select: { delta: true },
    });
    return rows.reduce((sum, r) => sum + r.delta, 0);
  }

  // ───── Spend / redeem ─────

  async redeem(userId: string, body: RedeemKaramaBody): Promise<KaramaRedeemResult> {
    const def = REDEEM_COSTS[body.reward];
    if (!def) throw new DomainException(ErrorCode.VALIDATION_FAILED, "Unknown reward.", 400);

    // Idempotency: same (userId, refType=REDEEM, refId=idempotencyKey) is a no-op replay.
    const existing = await this.prisma.karamaLedger.findFirst({
      where: { userId, refType: "REDEEM", refId: body.idempotencyKey },
      select: { id: true, createdAt: true, balanceAfter: true },
    });
    if (existing) {
      return {
        balance: existing.balanceAfter,
        reward: body.reward,
        appliedAt: existing.createdAt.toISOString(),
      };
    }

    let result: { balanceAfter: number; createdAt: Date };
    try {
      result = await this.applyDelta(userId, -def.cost, def.reason, {
        refType: "REDEEM",
        refId: body.idempotencyKey,
        requireBalance: def.cost,
      });
    } catch (err) {
      // Concurrent replay of the same key: the read above and this write are
      // not one transaction, so two simultaneous callers both miss the lookup
      // and the (userId, reason, refType, refId) unique decides the winner.
      // The loser must return the winner's result, not debit a second time.
      if (!isUniqueConstraintViolation(err)) throw err;
      // `findFirst`, not `findFirstOrThrow`: P2002 proves the winner's INSERT
      // happened, not that it committed, so this read can legitimately come
      // back empty and `OrThrow` would turn a handled race into a 500 on the
      // money path. Falling back to the live balance is correct either way —
      // the debit is not repeated, which is the only thing that must hold.
      const winner = await this.prisma.karamaLedger.findFirst({
        where: { userId, refType: "REDEEM", refId: body.idempotencyKey },
        select: { createdAt: true, balanceAfter: true },
      });
      const balance =
        winner?.balanceAfter ??
        (
          await this.prisma.user.findUnique({
            where: { id: userId },
            select: { karamaBalance: true },
          })
        )?.karamaBalance ??
        0;
      result = { balanceAfter: balance, createdAt: winner?.createdAt ?? new Date() };
    }

    return {
      balance: result.balanceAfter,
      reward: body.reward,
      appliedAt: result.createdAt.toISOString(),
    };
  }

  // ───── Internal cron: inactive monthly decay ─────

  async runMonthlyDecay(
    options: { now?: Date; dryRun?: boolean } = {},
  ): Promise<KaramaDecayReport> {
    const now = options.now ?? new Date();
    const cutoff = new Date(now.getTime() - KARAMA_DECAY_INACTIVITY_MS);
    const period = decayPeriod(now);
    const dryRun = options.dryRun ?? false;

    const candidates = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        karamaBalance: { gt: 0 },
        OR: [{ lastSeenAt: { lt: cutoff } }, { lastSeenAt: null, createdAt: { lt: cutoff } }],
      },
      orderBy: { id: "asc" },
      select: { id: true, karamaBalance: true },
    });

    // Fetch all existing decay records for this period in a single query to avoid N+1
    const existingDecays = await this.prisma.karamaLedger.findMany({
      where: {
        userId: { in: candidates.map((c) => c.id) },
        reason: "DECAY",
        refType: KARAMA_DECAY_REF_TYPE,
        refId: period,
      },
      select: { userId: true, id: true },
    });
    const existingDecayUserIds = new Set(existingDecays.map((d) => d.userId));

    let skippedAlreadyDecayedCount = 0;
    let totalDelta = 0;
    const decayedUserIds: string[] = [];

    for (const user of candidates) {
      // Check if we already processed a decay for this user in this period
      if (existingDecayUserIds.has(user.id)) {
        skippedAlreadyDecayedCount += 1;
        continue;
      }

      const delta = calculateDecayDelta(user.karamaBalance);
      if (delta >= 0) continue;

      if (dryRun) {
        totalDelta += delta;
        decayedUserIds.push(user.id);
      } else {
        try {
          await this.applyDelta(user.id, delta, "DECAY", {
            refType: KARAMA_DECAY_REF_TYPE,
            refId: period,
            requireBalance: Math.abs(delta),
          });
          totalDelta += delta;
          decayedUserIds.push(user.id);
        } catch (err) {
          if (isUniqueConstraintViolation(err)) {
            skippedAlreadyDecayedCount += 1;
            continue;
          }
          throw err;
        }
      }
    }

    if (decayedUserIds.length > 0) {
      this.log.log(
        `Karama decay run: ${dryRun ? "would decay" : "decayed"} ${
          decayedUserIds.length
        } inactive users by ${totalDelta} points (period=${period}).`,
      );
    } else {
      this.log.log(`Karama decay run: no eligible inactive balances (period=${period}).`);
    }

    return {
      scannedAt: now.toISOString(),
      cutoff: cutoff.toISOString(),
      period,
      dryRun,
      scannedCount: candidates.length,
      decayedCount: decayedUserIds.length,
      skippedAlreadyDecayedCount,
      totalDelta,
      decayedUserIds,
    };
  }

  // ───── Internal ledger writer ─────

  private async applyDelta(
    userId: string,
    delta: number,
    reason: KaramaReason,
    opts: {
      refType?: string | null;
      refId?: string | null;
      clampToCap?: boolean;
      requireBalance?: number;
    } = {},
  ): Promise<{ balanceAfter: number; createdAt: Date }> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { karamaBalance: true },
      });
      if (!user) {
        throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);
      }

      let effectiveDelta = delta;
      if (opts.clampToCap && delta > 0) {
        const headroom = Math.max(KARAMA_BALANCE_CAP - user.karamaBalance, 0);
        effectiveDelta = Math.min(delta, headroom);
        if (effectiveDelta <= 0) {
          // Already at cap — still log a 0-delta ledger row so future audit can see the attempt.
          const row = await tx.karamaLedger.create({
            data: {
              userId,
              delta: 0,
              balanceAfter: user.karamaBalance,
              reason,
              refType: opts.refType ?? null,
              refId: opts.refId ?? null,
            },
          });
          return { balanceAfter: user.karamaBalance, createdAt: row.createdAt };
        }
      }

      if (effectiveDelta < 0) {
        const needed = opts.requireBalance ?? Math.abs(effectiveDelta);
        if (user.karamaBalance < needed) {
          throw new DomainException(
            ErrorCode.VALIDATION_FAILED,
            "Insufficient Karama balance.",
            400,
          );
        }
      }

      const nextBalance = user.karamaBalance + effectiveDelta;
      const updated = await tx.user.update({
        where: { id: userId },
        data: { karamaBalance: nextBalance },
        select: { karamaBalance: true },
      });
      const row = await tx.karamaLedger.create({
        data: {
          userId,
          delta: effectiveDelta,
          balanceAfter: updated.karamaBalance,
          reason,
          refType: opts.refType ?? null,
          refId: opts.refId ?? null,
        },
      });
      return { balanceAfter: updated.karamaBalance, createdAt: row.createdAt };
    });
  }
}

function calculateDecayDelta(balance: number): number {
  if (balance <= 0) return 0;
  return -Math.max(1, Math.ceil(balance * KARAMA_DECAY_RATE));
}

function decayPeriod(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

function toLedgerDto(row: {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: KaramaReason;
  refType: string | null;
  refId: string | null;
  createdAt: Date;
}): KaramaLedgerEntry {
  return {
    id: row.id,
    delta: row.delta,
    balanceAfter: row.balanceAfter,
    reason: row.reason,
    refType: row.refType,
    refId: row.refId,
    createdAt: row.createdAt.toISOString(),
  };
}
