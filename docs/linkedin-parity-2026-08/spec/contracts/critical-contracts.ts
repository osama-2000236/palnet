// spec/contracts/critical-contracts.ts
//
// The contracts where a guess would break the design.
//
// The other ~52 Zod modules in this build are mechanical: a model in, a DTO
// out, and any competent implementer derives them from schema.delta.prisma
// without help. THESE are not mechanical. Each one below encodes a decision
// argued somewhere in the master spec, and re-deriving it from the prose would
// produce something that is nearly right and therefore worse than wrong.
//
// Copy these into packages/shared/src/ at the paths given in each block header.
// Zod 4. Do not "improve" a constant without changing the spec section that
// justifies it — the numbers are load-bearing and cross-referenced by tests.

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/money.ts                      — master spec §13.5
// ═══════════════════════════════════════════════════════════════════════════
//
// THE SINGLE MOST LIKELY MONEY BUG IN THIS BUILD: JOD has THREE decimal
// places, not two. An amount stored as if it had two is a 10x error, and it
// will not look wrong in any test that only uses ILS or USD.
//
// Every conversion between a display amount and a stored amount goes through
// this module. There is no second place that knows an exponent.

export const CURRENCIES = ["ILS", "JOD", "USD"] as const;
export const Currency = z.enum(CURRENCIES);
export type Currency = z.infer<typeof Currency>;

/** ISO 4217 minor-unit exponents. JOD is 3. This is not a typo. */
export const MINOR_UNITS: Record<Currency, number> = { ILS: 2, JOD: 3, USD: 2 };

export function toMinor(amount: number, currency: Currency): number {
  return Math.round(amount * 10 ** MINOR_UNITS[currency]);
}
export function fromMinor(minor: number, currency: Currency): number {
  return minor / 10 ** MINOR_UNITS[currency];
}

export const Money = z.object({
  minor: z.number().int(),
  currency: Currency,
});
export type Money = z.infer<typeof Money>;

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/evidence-score.ts             — master spec §5.3
// ═══════════════════════════════════════════════════════════════════════════
//
// Cached on Profile.evidenceScore, recomputed ON WRITE only, never on read.
// Used ONLY to order a candidate list the employer has already opened —
// never in the feed, never in public search.
//
// Rule 1 (§4.2): no term is money. check-ranking-purity.mjs scans this file.

export const EvidenceSummary = z.object({
  confirmedWorkProofs: z.number().int().min(0),
  distinctCounterparties: z.number().int().min(0),
  standing: z
    .object({ occupationKey: z.string(), value: z.number().int().min(1).max(4) })
    .nullable(),
  licence: z
    .object({
      bodyKey: z.string(),
      status: z.enum(["DECLARED", "VERIFIED", "EXPIRED"]),
      practice: z.enum(["TRAINEE", "PRACTISING", "NON_PRACTISING"]),
    })
    .nullable(),
  recommendations: z.number().int().min(0),
  verifications: z.array(z.enum(["PHONE", "WORK_EMAIL", "EDU_EMAIL", "PROFESSIONAL_BODY"])),
  /** null below MIN_RATINGS_FOR_AVERAGE — §16.5. A single retaliatory 1-star
   *  must not be allowed to define somebody. */
  ratingAvg: z.number().min(1).max(5).nullable(),
  ratingCount: z.number().int().min(0),
});
export type EvidenceSummary = z.infer<typeof EvidenceSummary>;

export function evidenceScore(s: EvidenceSummary): number {
  const proofs = 30 * (Math.min(s.confirmedWorkProofs, 6) / 6);
  const parties = 20 * (Math.min(s.distinctCounterparties, 4) / 4);
  const standing = 15 * (s.standing ? s.standing.value / 4 : 0);
  const licence = 15 * (s.licence?.status === "VERIFIED" ? 1 : s.licence ? 0.3 : 0);
  const recs = 10 * (Math.min(s.recommendations, 3) / 3);
  const verif = 10 * (s.verifications.length / 4);
  return Math.min(100, Math.round(proofs + parties + standing + licence + recs + verif));
}

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/standing.ts                   — master spec §5.4.1
// ═══════════════════════════════════════════════════════════════════════════
//
// CRAFT track only. 1..4. Never decays; only suspended or recomputed downward
// after evidence is withdrawn. No billing or karama code path may write it.
//
// OCCUPATIONS.md §2b decided the ladder exists; it did not state thresholds.
// These are the thresholds. There are no others.

export interface StandingInput {
  confirmedProofs: number;
  distinctCounterparties: number;
  /** Days between the earliest and latest confirmedAt. */
  spanDays: number;
  /** Vouches from DISTINCT value-4 holders in the same occupation. */
  vouchesFromMasters: number;
  /** A Recommendation authored by a PROFESSIONAL_BODY-verified account. */
  hasBodyRecommendation: boolean;
}

export const STANDING_THRESHOLDS = [
  { value: 2, proofs: 3, counterparties: 2, spanDays: 0 },
  { value: 3, proofs: 10, counterparties: 5, spanDays: 180 },
  { value: 4, proofs: 25, counterparties: 12, spanDays: 540 },
] as const;

/** Returns 1..4. 1 is automatic on an OccupationClaim and renders as
 *  «مهنة معلنة» until any evidence exists. */
export function standingFor(i: StandingInput): 1 | 2 | 3 | 4 {
  let value: 1 | 2 | 3 | 4 = 1;
  for (const t of STANDING_THRESHOLDS) {
    const meets =
      i.confirmedProofs >= t.proofs &&
      i.distinctCounterparties >= t.counterparties &&
      i.spanDays >= t.spanDays;
    if (!meets) break;
    if (t.value === 4 && !(i.vouchesFromMasters >= 2 || i.hasBodyRecommendation)) break;
    value = t.value;
  }
  return value;
}

/** A value-4 holder may hold at most 5 active vouches. An upheld dispute
 *  against a vouchee drops capacity to 0 for 180 days and FLAGS their active
 *  vouches for review — it does not revoke them, which would punish the
 *  innocent vouchees. */
export const VOUCH_ACTIVE_CAP = 5;
export const VOUCH_SUSPENSION_DAYS = 180;

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/matching.ts                   — master spec §10.3
// ═══════════════════════════════════════════════════════════════════════════
//
// MATCHING.md §5's fairness rules, made structural:
//
//  1. NO SCORE MAY AUTO-REJECT. A MUST failure populates mustFailures[] and
//     the employer decides. ApplicationStatus reaches REJECTED only through a
//     human action carrying a RejectionReason.
//  2. PROTECTED ATTRIBUTES ARE NEVER INPUTS. MatchInput below is a CLOSED
//     interface. A test asserts its key set EXACTLY — that test is the
//     enforcement, not this comment.
//  3. matchSnapshot freezes score + weightsVersion at submission, so a later
//     profile edit or weight change cannot rewrite a past decision.
//  4. Every score is explainable: terms[] carries each requirement, whether it
//     was satisfied, and its weight.

export const MATCH_WEIGHTS_VERSION = "2026-08-08.1";

/** CLOSED. No gender, no addressGender, no age, no birth date, no marital
 *  status, no originGovernorate, no refugee status, no religion. Adding a key
 *  here requires an ADR and will fail matching.contract.spec.ts until the
 *  expected key set is updated deliberately. */
export interface MatchInput {
  occupationKeys: string[];
  familyKeys: string[];
  canonicalSkillIds: string[];
  licences: { bodyKey: string; occupationKey: string; status: string }[];
  standings: { occupationKey: string; value: number }[];
  experienceYearsByOccupation: Record<string, number>;
  languages: { languageKey: string; proficiency: string }[];
  educationLevel: number;
  governorateKey: string | null;
  acceptingWork: boolean;
  openToWork: boolean;
  availableFrom: Date | null;
  expectedPayMinor: number | null;
  expectedPayCurrency: Currency | null;
  evidenceScore: number;
}

export const ReachabilityBand = z.enum([
  "SAME_GOVERNORATE",
  "ADJACENT",
  "SAME_REGION",
  "CROSS_REGION",
  "REQUIRES_PERMIT",
]);
export type ReachabilityBand = z.infer<typeof ReachabilityBand>;

/** REMOTE jobs are always 1.00 — reachability is not a question for them. */
export const REACHABILITY_MODIFIER: Record<ReachabilityBand, number> = {
  SAME_GOVERNORATE: 1.15,
  ADJACENT: 1.05,
  SAME_REGION: 1.0,
  CROSS_REGION: 0.85,
  REQUIRES_PERMIT: 0.6,
};

export const MatchTerm = z.object({
  requirementId: z.string(),
  kind: z.string(),
  level: z.enum(["MUST", "NICE"]),
  weight: z.number().int(),
  satisfied: z.boolean(),
  /** 0..1. Partial credit exists for exactly one case: an occupation match on
   *  the same Family rather than the same key, which scores 0.7. */
  credit: z.number().min(0).max(1),
});

export const MatchSnapshot = z.object({
  weightsVersion: z.literal(MATCH_WEIGHTS_VERSION),
  score: z.number().min(0).max(100),
  base: z.number().min(0).max(100),
  modifiers: z.object({
    reachability: z.number(),
    evidence: z.number(),
    availability: z.number(),
    pay: z.number(),
  }),
  mustFailures: z.array(z.string()),
  terms: z.array(MatchTerm),
  computedAt: z.string().datetime(),
});
export type MatchSnapshot = z.infer<typeof MatchSnapshot>;

/** Each modifier clamps to [0.6, 1.15] before multiplication. */
export const MODIFIER_CLAMP = { min: 0.6, max: 1.15 } as const;

/** The seeker-side view. Same terms; the pay modifier inverts (a job paying
 *  ABOVE the candidate's expectation scores higher), and a below-minimum-wage
 *  job caps the score at 40 and renders the never-pay warning. */
export const FIT_CAP_BELOW_MINIMUM_WAGE = 40;

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/ranking/feed-score.ts         — master spec §8.2
// ═══════════════════════════════════════════════════════════════════════════
//
// FEED-RANKING.md, implemented. Deterministic, explainable, finite.
// check-ranking-purity.mjs scans this file: no Subscription, PlanCode,
// Invoice, EmployerCredit, karamaBalance, KaramaLedger, isPremium, promoted.

export const FEED_SCORE_WEIGHTS = {
  affinity: 1.0,
  topicMatch: 0.85,
  recency: 0.6,
  quality: 0.45,
  proximity: 0.3,
  mutedPenalty: -2.0,
} as const;

/** 0.5 ^ (age_hours / 18) */
export const RECENCY_HALF_LIFE_HOURS = 18;

export const AFFINITY = {
  FIRST_DEGREE: 1.0,
  FOLLOWED: 0.6,
  /** 2nd degree with >= 2 mutuals. */
  SECOND_DEGREE: 0.35,
  OTHER: 0.2,
  /** PUBLIC group post, for members of that group. */
  GROUP: 0.5,
} as const;

/** All three terms read denormalised counters. Never a live COUNT(*). */
export function quality(p: {
  comments: number;
  reactions: number;
  hasMedia: boolean;
  isWorkSample: boolean;
}): number {
  return (
    0.4 * (Math.min(p.comments, 8) / 8) +
    0.3 * (Math.min(p.reactions, 20) / 20) +
    0.3 * (p.hasMedia || p.isWorkSample ? 1 : 0)
  );
}

export const SIGNAL_VALUE = {
  POST_EXPAND: 1.0,
  /** Counted only above 4 seconds, capped at one per post. */
  POST_DWELL: 0.5,
  LINK_CLICK: 1.5,
  PROFILE_VISIT: 1.0,
  SEARCH_QUERY: 2.0,
  JOB_APPLY: 3.0,
  NOT_INTERESTED: -4.0,
  HIDE_POST: -2.0,
} as const;

export const INTEREST = {
  /** w' = w * decay(dt) + ALPHA * signalValue */
  ALPHA: 0.3,
  HALF_LIFE_DAYS: 30,
  CLAMP_MIN: -10,
  CLAMP_MAX: 10,
  /** Below this the product OFFERS a TopicMute. It never creates one silently
   *  — FEED-RANKING.md §7: the system may not develop opinions it cannot show
   *  you. */
  OFFER_MUTE_BELOW: -3,
  /** The nightly decay job deletes weights below this. */
  PRUNE_BELOW: 0.01,
} as const;

export const SLATE = {
  SIZE: 120,
  TTL_MINUTES: 90,
  /** Diversity, applied as a greedy re-order AFTER scoring — never a re-score.
   *  FEED-RANKING.md §6. */
  MAX_CONSECUTIVE_SAME_AUTHOR: 2,
  MAX_PER_TOPIC_IN_WINDOW: 4,
  TOPIC_WINDOW: 10,
  /** Exactly one promoted item, at a FIXED index, never scored, never
   *  re-ordered. §13.6. */
  PROMOTED_INDEX: 4,
  MAX_PROMOTED: 1,
} as const;

/** Fewer than this many InterestWeight rows = cold start: 50% connections
 *  (reverse-chron), 30% own-occupation topics, 20% own governorate.
 *  FEED-RANKING.md §8. */
export const COLD_START_WEIGHT_THRESHOLD = 5;
export const COLD_START_SPLIT = { connections: 0.5, occupation: 0.3, governorate: 0.2 } as const;

export const MAX_TOPICS_PER_POST = 18;
/** Source priority when the ceiling is hit — keep in this order, drop the tail. */
export const TOPIC_SOURCE_PRIORITY = [
  "AUTHOR_OCCUPATION",
  "HASHTAG",
  "COMPANY",
  "TEXT_MATCH",
  "GOVERNORATE",
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/connection-class.ts           — master spec §15.3
// ═══════════════════════════════════════════════════════════════════════════
//
// A 2G connection delivers roughly 20-40 kbit/s. At 30 kbit/s, every 24 KB of
// payload costs 6.4 seconds. That number is the design constraint for the
// whole product, which is why the budgets below are asserted in CI rather
// than recommended in a doc.

export const ConnectionClass = z.enum(["offline", "slow", "moderate", "fast"]);
export type ConnectionClass = z.infer<typeof ConnectionClass>;

export const MODE_BY_CLASS = {
  offline: "light",
  slow: "light",
  moderate: "normal",
  fast: "full",
} as const;

export const MODE_RULES = {
  light: {
    imageAutoLoad: false,
    maxAvatarPx: 32,
    video: false,
    feedPageSize: 5,
    prefetch: false,
    /** SSE degrades to polling. Reconnect storms on 2G are a real cost. */
    ssePollSeconds: 120,
  },
  normal: { imageAutoLoad: true, imageWidth: 640, maxAvatarPx: 96, video: true, feedPageSize: 10, prefetch: false, ssePollSeconds: null },
  full: { imageAutoLoad: true, imageWidth: 1080, maxAvatarPx: 96, video: true, feedPageSize: 10, prefetch: true, ssePollSeconds: null },
} as const;

/** Gzipped JSON, media excluded. Asserted in
 *  apps/api/test/payload-budget.e2e-spec.ts. Exceeding one FAILS THE BUILD. */
export const PAYLOAD_BUDGET_BYTES = {
  "GET /feed": 24_576,
  "GET /jobs": 18_432,
  "GET /profiles/:handle": 12_288,
  "GET /messaging/rooms": 10_240,
  "GET /messaging/rooms/:id/messages": 14_336,
  "GET /notifications": 9_216,
  "GET /search/*": 12_288,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/outbox/types.ts               — master spec §15.4
// ═══════════════════════════════════════════════════════════════════════════
//
// ONE implementation, TWO storage adapters (web: IndexedDB, mobile:
// expo-sqlite). The queue logic, retry schedule and idempotency handling live
// in @baydar/shared and the spec runs against BOTH adapters — that is the
// lockstep proof, and it is why this is not implemented twice.

export const OutboxKind = z.enum(["POST", "MESSAGE", "APPLICATION", "WORK_PROOF_CONFIRM"]);

export const OutboxEntry = z.object({
  /** Client-generated UUID. Doubles as the Idempotency-Key header. */
  id: z.string().uuid(),
  kind: OutboxKind,
  payload: z.unknown(),
  createdAt: z.number().int(),
  attempts: z.number().int().min(0),
  lastError: z.string().optional(),
  state: z.enum(["queued", "sending", "failed"]),
});
export type OutboxEntry = z.infer<typeof OutboxEntry>;

export const OUTBOX = {
  /** 2^n seconds, capped. */
  BACKOFF_BASE_SECONDS: 2,
  BACKOFF_CAP_SECONDS: 300,
  MAX_ATTEMPTS: 8,
  /** After MAX_ATTEMPTS the entry becomes `failed` and appears in a
   *  user-visible "لم تُرسل" tray offering retry or discard.
   *  NEVER silently dropped. */
  IDEMPOTENCY_TTL_HOURS: 48,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/safety/thresholds.ts          — master spec §16
// ═══════════════════════════════════════════════════════════════════════════

export const SAFETY = {
  /** Three upheld FEE_REQUEST reports auto-suspend an employer pending review.
   *  §10.4 / §16.3. Automatic suspension is why the appeal path in §16.6 is
   *  mandatory rather than optional. */
  FEE_REPORT_SUSPEND_THRESHOLD: 3,
  /** §16.5 mitigation 2. Below this, EvidenceSummary.ratingAvg is null and the
   *  UI shows the count only. */
  MIN_RATINGS_FOR_AVERAGE: 4,
  /** §16.5 mitigation 1. Neither side sees the other's rating until both have
   *  submitted, or the window closes. */
  RATING_BLIND_REVEAL_DAYS: 14,
  /** §16.5 mitigation 3. Opens at HIRED; closes 14 days after the WorkProof is
   *  confirmed, or 60 days after HIRED if no proof appears. */
  RATING_WINDOW_AFTER_PROOF_DAYS: 14,
  RATING_WINDOW_NO_PROOF_DAYS: 60,
  /** A first message from a non-connection, non-follower. §14.3 — the single
   *  most effective anti-harassment control available, and it costs nothing. */
  MESSAGE_REQUEST_MAX_BEFORE_ACCEPT: 1,
  /** k-anonymity for wage insight. §10.6. Below k, widen to region, then
   *  national; if national is still below k, return null and SAY SO rather
   *  than inventing a number. */
  WAGE_INSIGHT_K: 7,
  WAGE_OBSERVATION_WINDOW_MONTHS: 18,
  WAGE_ROUNDING_ILS: 50,
  /** Profile-view breakdowns. §5.4. */
  PROFILE_VIEW_K: 5,
  /** Above this follower count, individual follow notifications are suppressed
   *  and replaced by a weekly aggregate. §6.2 — otherwise any company page
   *  with traction generates a notification storm on 2G. */
  FOLLOW_NOTIFICATION_SUPPRESS_ABOVE: 500,
} as const;

/** Entitlement, never per-message billing — so the incentive is to send fewer
 *  and better. Unused does not roll over. §14.3. */
export const OUTREACH_MONTHLY_QUOTA = {
  EMPLOYER_FREE: 0,
  EMPLOYER_BASIC: 5,
  EMPLOYER_PRO: 30,
  EMPLOYER_DIASPORA: 30,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/content-limits.ts             — master spec §7, §12
// ═══════════════════════════════════════════════════════════════════════════

export const CONTENT = {
  MAX_MENTIONS_PER_POST: 20,
  MAX_MENTIONS_PER_COMMENT: 10,
  MAX_HASHTAGS_PER_POST: 10,
  MAX_TEXT_MATCH_TOPICS: 3,
  /** Conservative Arabic reading rate. readMinutes = ceil(words / this). */
  ARABIC_READ_WPM: 180,
  /** No autoplay anywhere, ever. Poster frame + explicit play. Disabled with
   *  an explanatory line on a 2G connection. No transcoding pipeline. */
  VIDEO_MAX_SECONDS: 60,
  VIDEO_MAX_BYTES: 20 * 1024 * 1024,
  /** 32 kbit/s mono Opus. 120 s ~= 480 KB. */
  VOICE_MAX_SECONDS: 120,
  VOICE_BITRATE_BPS: 32_000,
  VOICE_WAVEFORM_BUCKETS: 16,
  /** 8 minutes at 32 kbit/s ~= 1.9 MB. The UI states the megabyte cost in the
   *  download button's label. */
  LESSON_AUDIO_MAX_SECONDS: 480,
  LESSON_AUDIO_MAX_BYTES: Math.round(2.5 * 1024 * 1024),
  /** Longer than this is a curriculum, not a path. */
  MAX_LESSONS_PER_PATH: 24,
  /** More than this is a directory, not a profile. */
  MAX_ACTIVE_SERVICE_LISTINGS: 20,
  SERVICE_INQUIRY_EXPIRY_DAYS: 14,
  MAX_GROUP_ROOM_PARTICIPANTS: 20,
  MIN_GROUP_ROOM_PARTICIPANTS: 2,
  /** Newsletter fanout. A 5,000-subscriber issue must not look like a spam
   *  burst to Resend or to the recipients' providers. */
  NEWSLETTER_BATCH_SIZE: 200,
  NEWSLETTER_BATCH_DELAY_MS: 1000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// packages/shared/src/pricing.ts                    — master spec §13.2
// ═══════════════════════════════════════════════════════════════════════════
//
// EVERY price is derived from the statutory monthly minimum wage of 1,880 ILS,
// stated as a PERCENTAGE, then rounded to a legible shekel figure. The
// percentage is the specification; the shekel number is the rounding.
//
// LinkedIn Premium Career is US$29.99/month = 5.9% of a Palestinian minimum
// monthly wage. A price ported unchanged from LinkedIn's card is not a price,
// it is a decline.

export const MINIMUM_MONTHLY_WAGE_ILS = 1880;

export const PRICING_ILS = {
  MEMBER_FREE: { minor: 0, pctOfMinWage: 0 },
  MEMBER_PLUS: { minor: toMinor(30, "ILS"), pctOfMinWage: 0.016 },
  MEMBER_PLUS_ANNUAL: { minor: toMinor(300, "ILS"), pctOfMinWage: 0.0133 },
  EMPLOYER_FREE: { minor: 0, pctOfMinWage: 0 },
  EMPLOYER_BASIC: { minor: toMinor(150, "ILS"), pctOfMinWage: 0.08 },
  EMPLOYER_PRO: { minor: toMinor(450, "ILS"), pctOfMinWage: 0.24 },
  FEATURED_SLOT: { minor: toMinor(75, "ILS"), pctOfMinWage: 0.04 },
} as const;

/** Priced in USD because the payer is not on a Palestinian wage. §2.1. */
export const PRICING_USD = { EMPLOYER_DIASPORA: { minor: toMinor(149, "USD") } } as const;

/**
 * RULE 1, §4.2 — PERMANENT.
 *
 * MEMBER_PLUS may never contain: application boost, profile boost, ranking
 * priority, "featured applicant", "top applicant" placement, or any visibility
 * a non-payer lacks in front of an employer.
 *
 * HANDOFF.md gap #1 records that two such rewards existed, debited points and
 * granted nothing. They were correctly withdrawn. THEY DO NOT COME BACK.
 *
 * Enforced by a test asserting no Plan.features JSON key matches this pattern.
 */
export const BANNED_PLAN_FEATURE_PATTERN =
  /boost|rank|priority|featured_?profile|top_?applicant|visibility/i;

/** What MEMBER_PLUS actually contains — all genuine utility that costs Baydar
 *  money to provide, none of it rank. Free-tier limits in parentheses. */
export const MEMBER_PLUS_ENTITLEMENTS = {
  profileViewsBreakdown: true, //         (free: total count only)
  salaryInsightPerWeek: Infinity, //      (free: 3)
  savedSearches: Infinity, //             (free: 3)
  profileTranslations: true, //           (free: none)
  offlineLearningPaths: Infinity, //      (free: 2 concurrent)
  documentLockerSlots: 10, //             (free: 2)
  applicationInsight: true, //   how many applied and the fit distribution —
  //                             INFORMATION ABOUT THE MARKET, NOT A POSITION IN IT
} as const;
