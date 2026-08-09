// WS-01's vocabulary: the enums that describe a person rather than a thing they
// posted. Mirrors of Prisma enums, same contract as enums.ts -- keep in sync
// with packages/db/prisma/schema.prisma.
//
// Split out of enums.ts because that file crossed the 300-LOC ceiling and this
// is where the seam actually is: identity, verification and how somebody is
// addressed are one subject, and the rest of enums.ts is everything else.

/** Self-reported, and labelled as such. Baydar runs no language test. */
export const LanguageLevel = {
  BASIC: "BASIC",
  CONVERSATIONAL: "CONVERSATIONAL",
  PROFESSIONAL: "PROFESSIONAL",
  NATIVE: "NATIVE",
} as const;
export type LanguageLevel = (typeof LanguageLevel)[keyof typeof LanguageLevel];

/**
 * How the author knew the subject. Required, because "worked with" covers a
 * manager and a supplier and those are not the same testimonial.
 */
export const RecommendationRelation = {
  MANAGED_DIRECTLY: "MANAGED_DIRECTLY",
  REPORTED_TO_ME: "REPORTED_TO_ME",
  SAME_TEAM: "SAME_TEAM",
  DIFFERENT_TEAM: "DIFFERENT_TEAM",
  CLIENT_OF: "CLIENT_OF",
  SUPPLIER_TO: "SUPPLIER_TO",
  TAUGHT: "TAUGHT",
  STUDIED_UNDER: "STUDIED_UNDER",
} as const;
export type RecommendationRelation =
  (typeof RecommendationRelation)[keyof typeof RecommendationRelation];

export const RecommendationStatus = {
  PENDING: "PENDING",
  PUBLISHED: "PUBLISHED",
  DECLINED: "DECLINED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type RecommendationStatus = (typeof RecommendationStatus)[keyof typeof RecommendationStatus];

/**
 * The four identity checks that exist in this market. LinkedIn's CLEAR and
 * NFC-passport paths do not: neither operates here, and a product that asks for
 * a document it cannot verify is asking for a photograph of an ID.
 */
export const VerificationMethod = {
  PHONE: "PHONE",
  WORK_EMAIL: "WORK_EMAIL",
  EDU_EMAIL: "EDU_EMAIL",
  PROFESSIONAL_BODY: "PROFESSIONAL_BODY",
} as const;
export type VerificationMethod = (typeof VerificationMethod)[keyof typeof VerificationMethod];

export const VerificationStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  FAILED: "FAILED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const OtpPurpose = {
  PHONE_VERIFY: "PHONE_VERIFY",
  WORK_PROOF_CONFIRM: "WORK_PROOF_CONFIRM",
  ACCOUNT_RECOVERY: "ACCOUNT_RECOVERY",
} as const;
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

/**
 * Arabic requires grammatical gender agreement in verbs and adjectives
 * addressed to the reader. This is a rendering input, not a pronoun: a
 * second-person imperative addressed to a woman is a different word, and
 * getting it wrong in every string is what a native speaker notices first.
 *
 * NEUTRAL_PLURAL is the default and is always safe -- Arabic uses the plural
 * for polite address, so a member who has not said is addressed politely.
 */
export const AddressGender = {
  FEMININE: "FEMININE",
  MASCULINE: "MASCULINE",
  NEUTRAL_PLURAL: "NEUTRAL_PLURAL",
} as const;
export type AddressGender = (typeof AddressGender)[keyof typeof AddressGender];

/**
 * Why the gap. DISPLACEMENT and DETENTION are not optional here -- a gap this
 * market produces must not read as unemployability, and the only way to stop
 * that is to let it be named.
 */
export const CareerBreakReason = {
  CAREER_BREAK_STUDY: "CAREER_BREAK_STUDY",
  CAREER_BREAK_CARE: "CAREER_BREAK_CARE",
  CAREER_BREAK_HEALTH: "CAREER_BREAK_HEALTH",
  CAREER_BREAK_DISPLACEMENT: "CAREER_BREAK_DISPLACEMENT",
  CAREER_BREAK_DETENTION: "CAREER_BREAK_DETENTION",
  CAREER_BREAK_TRAVEL: "CAREER_BREAK_TRAVEL",
  CAREER_BREAK_OTHER: "CAREER_BREAK_OTHER",
} as const;
export type CareerBreakReason = (typeof CareerBreakReason)[keyof typeof CareerBreakReason];
