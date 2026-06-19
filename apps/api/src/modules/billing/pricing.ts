import { PlanCode } from "@baydar/shared";

// Points price per plan when paying via Karama redemption. Only USER_PREMIUM
// is redeemable for now — employer plans require real money to avoid letting
// individuals offset a company's bill with their personal points. Must stay
// in sync with REDEEM_COSTS in karama.service.ts.
export const POINTS_PRICE_BY_PLAN: Partial<Record<PlanCode, number>> = {
  USER_PREMIUM: 500,
};

export const ALL_PLAN_CODES = Object.values(PlanCode);

export const PLAN_DEFS: Record<
  PlanCode,
  {
    name: string;
    priceCents: number;
    currency: string;
    intervalDays: number | null;
    features: Record<string, unknown>;
  }
> = {
  EMPLOYER_FREE: {
    name: "Employer Free",
    priceCents: 0,
    currency: "USD",
    intervalDays: 30,
    features: { activeJobs: 1, applicantInbox: true, featuredSlots: 0 },
  },
  EMPLOYER_BASIC: {
    name: "Employer Basic",
    priceCents: 2900,
    currency: "USD",
    intervalDays: 30,
    features: { activeJobs: 5, applicantInbox: true, basicAnalytics: true, featuredSlots: 0 },
  },
  EMPLOYER_PRO: {
    name: "Employer Pro",
    priceCents: 9900,
    currency: "USD",
    intervalDays: 30,
    features: {
      activeJobs: 25,
      applicantInbox: true,
      advancedAnalytics: true,
      csvExport: true,
      featuredSlots: 1,
    },
  },
  FEATURED_SLOT: {
    name: "Featured Job Slot",
    priceCents: 4900,
    currency: "USD",
    intervalDays: null,
    features: { featuredSlots: 1, durationDays: 7 },
  },
  USER_PREMIUM: {
    name: "Diaspora Premium User",
    priceCents: 500,
    currency: "USD",
    intervalDays: 30,
    features: { profileAnalytics: true, whoViewedMe: true, diasporaBadge: true },
  },
};

export function jobLimitFromFeatures(features: unknown): number {
  if (!features || typeof features !== "object") return 1;
  const activeJobs = (features as { activeJobs?: unknown }).activeJobs;
  return typeof activeJobs === "number" && Number.isFinite(activeJobs) ? activeJobs : 1;
}
