import { KARAMA_REWARD_COSTS, PlanCode } from "@baydar/shared";

// Points price per plan when paying via Karama redemption. Only USER_PREMIUM
// is redeemable for now — employer plans require real money to avoid letting
// individuals offset a company's bill with their personal points.
// The price itself lives in `@baydar/shared` because both clients render it.
export const USER_PREMIUM_POINTS_PRICE = KARAMA_REWARD_COSTS.PREMIUM_30D;
export const POINTS_PRICE_BY_PLAN: Partial<Record<PlanCode, number>> = {
  USER_PREMIUM: USER_PREMIUM_POINTS_PRICE,
};

export const ALL_PLAN_CODES = Object.values(PlanCode);

// PLAN_DEFS moved to @baydar/shared — `packages/db/prisma/seed.ts` upserts the
// same catalog and the two copies were maintained by hand.

export function jobLimitFromFeatures(features: unknown): number {
  if (!features || typeof features !== "object") return 1;
  const activeJobs = (features as { activeJobs?: unknown }).activeJobs;
  return typeof activeJobs === "number" && Number.isFinite(activeJobs) ? activeJobs : 1;
}
