import { z } from "zod";

export const KaramaReason = {
  PROFILE_COMPLETE: "PROFILE_COMPLETE",
  ENDORSEMENT: "ENDORSEMENT",
  VERIFIED_HIRE: "VERIFIED_HIRE",
  RATING_RECEIVED: "RATING_RECEIVED",
  REPORT_UPHELD: "REPORT_UPHELD",
  FIRST_POST: "FIRST_POST",
  REDEEM_BOOST_APPLICATION: "REDEEM_BOOST_APPLICATION",
  REDEEM_PREMIUM: "REDEEM_PREMIUM",
  REDEEM_FEATURED_PROFILE: "REDEEM_FEATURED_PROFILE",
  DECAY: "DECAY",
  ADJUSTMENT: "ADJUSTMENT",
} as const;
export type KaramaReason = (typeof KaramaReason)[keyof typeof KaramaReason];

/**
 * What points can actually be spent on.
 *
 * `BOOST_APPLICATION` (100 pts) and `FEATURED_PROFILE_7D` (1000 pts) were
 * priced, offered on both clients, and granted nothing: `redeem()` wrote the
 * negative ledger row, no column recorded the grant and no ranking pass read
 * one — and `RedeemKaramaBody` has no target field, so "boost application"
 * could not even say *which* application. Withdrawn rather than left charging
 * for nothing; they come back when a column and a ranking read exist.
 *
 * `KaramaReason` deliberately keeps `REDEEM_BOOST_APPLICATION` and
 * `REDEEM_FEATURED_PROFILE`: ledger rows written before this must stay
 * readable, and the Prisma enum still has both.
 */
export const KaramaReward = {
  PREMIUM_30D: "PREMIUM_30D",
} as const;
export type KaramaReward = (typeof KaramaReward)[keyof typeof KaramaReward];

/**
 * Points price per reward — the one copy. Both clients used to hardcode 500
 * next to a server constant that could change without them.
 */
export const KARAMA_REWARD_COSTS: Record<KaramaReward, number> = {
  PREMIUM_30D: 500,
};

export const KaramaLedgerEntry = z.object({
  id: z.string().cuid(),
  delta: z.number().int(),
  balanceAfter: z.number().int().nonnegative(),
  reason: z.nativeEnum(KaramaReason),
  refType: z.string().nullable(),
  refId: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type KaramaLedgerEntry = z.infer<typeof KaramaLedgerEntry>;

export const KaramaBalance = z.object({
  balance: z.number().int().nonnegative(),
  cap: z.number().int().nonnegative(),
  recent: z.array(KaramaLedgerEntry),
});
export type KaramaBalance = z.infer<typeof KaramaBalance>;

export const RedeemKaramaBody = z.object({
  reward: z.nativeEnum(KaramaReward),
  refId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(64),
});
export type RedeemKaramaBody = z.infer<typeof RedeemKaramaBody>;

export const KaramaRedeemResult = z.object({
  balance: z.number().int().nonnegative(),
  reward: z.nativeEnum(KaramaReward),
  appliedAt: z.string().datetime(),
});
export type KaramaRedeemResult = z.infer<typeof KaramaRedeemResult>;
