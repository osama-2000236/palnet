// Mirror of Prisma enums. Keep in sync with packages/db/prisma/schema.prisma.

export const UserRole = {
  USER: "USER",
  COMPANY_ADMIN: "COMPANY_ADMIN",
  MODERATOR: "MODERATOR",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ConnectionStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  WITHDRAWN: "WITHDRAWN",
  BLOCKED: "BLOCKED",
} as const;
export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

export const ReactionType = {
  LIKE: "LIKE",
  CELEBRATE: "CELEBRATE",
  SUPPORT: "SUPPORT",
  LOVE: "LOVE",
  INSIGHTFUL: "INSIGHTFUL",
  FUNNY: "FUNNY",
} as const;
export type ReactionType = (typeof ReactionType)[keyof typeof ReactionType];

export const MediaKind = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  DOCUMENT: "DOCUMENT",
} as const;
export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];

export const NotificationType = {
  CONNECTION_REQUEST: "CONNECTION_REQUEST",
  CONNECTION_ACCEPTED: "CONNECTION_ACCEPTED",
  POST_REACTION: "POST_REACTION",
  POST_COMMENT: "POST_COMMENT",
  POST_MENTION: "POST_MENTION",
  MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
  JOB_APPLICATION_UPDATE: "JOB_APPLICATION_UPDATE",
  JOB_ALERT: "JOB_ALERT",
  PROFILE_VIEW: "PROFILE_VIEW",
  MODERATION_ACTION: "MODERATION_ACTION",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Engagement type — what the working relationship is. The five values added in
 * 2026-07 exist because JobType was collapsing three orthogonal axes into one
 * (engagement, time commitment, pay basis) and had no way to say "مياومة".
 * Pay basis is now `PayBasis`; time commitment stays encoded in FULL_TIME /
 * PART_TIME, which is only meaningful for salaried work anyway.
 * docs/design/OCCUPATIONS.md, and NEXT-SESSION-PROMPT.md §B4 for the reasoning.
 */
export const JobType = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACT",
  TEMPORARY: "TEMPORARY",
  /** موسمي — olive season, planting, Ramadan retail. Recurs, so JobAlert matters. */
  SEASONAL: "SEASONAL",
  /** مياومة — day-wage work. The single biggest gap in the original six. */
  DAY_LABOR: "DAY_LABOR",
  /** بالمقطوعة — the whole job for one agreed price. The craft default. */
  PIECE_WORK: "PIECE_WORK",
  /** تلمذة مهنية — the Ministry of Labour's own term. The ladder's entry ramp. */
  APPRENTICESHIP: "APPRENTICESHIP",
  /** تدريب جامعي — relabelled, since «تدريب» now collides with APPRENTICESHIP. */
  INTERNSHIP: "INTERNSHIP",
  /** عمل حر */
  FREELANCE: "FREELANCE",
  VOLUNTEER: "VOLUNTEER",
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

/**
 * What the money is per. `MONTHLY` is the default so every pre-existing Job row
 * keeps its meaning without a data migration: `salaryMin`/`salaryMax` are a
 * range *in this basis*.
 */
export const PayBasis = {
  MONTHLY: "MONTHLY",
  DAILY: "DAILY",
  HOURLY: "HOURLY",
  PER_JOB: "PER_JOB",
  PER_PIECE: "PER_PIECE",
  COMMISSION: "COMMISSION",
} as const;
export type PayBasis = (typeof PayBasis)[keyof typeof PayBasis];

/**
 * What kind of business a `Company` is. One enum instead of a second model —
 * Company already carries verified, city, industry, members, jobs and billing.
 * `EMPLOYER` is the default so existing rows are unchanged.
 */
export const CompanyKind = {
  EMPLOYER: "EMPLOYER",
  /** مكتب مهني — accounting, audit, law, engineering, consulting, clinics. Leads with its practice licence. */
  FIRM: "FIRM",
  SHOP: "SHOP",
  WORKSHOP: "WORKSHOP",
  /** منشأة غذائية — bakery, restaurant, kitchen. */
  FOOD: "FOOD",
  FARM: "FARM",
  /** عمل فردي — one person's own business. Profile-shaped, not org-shaped. */
  SOLO: "SOLO",
} as const;
export type CompanyKind = (typeof CompanyKind)[keyof typeof CompanyKind];

/**
 * A `WorkProof`'s lifecycle. Only `CONFIRMED` counts toward a `Standing`, and
 * the counterparty — never the worker — moves it there.
 */
export const WorkProofStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
  DISPUTED: "DISPUTED",
} as const;
export type WorkProofStatus = (typeof WorkProofStatus)[keyof typeof WorkProofStatus];

/** Why a `Standing` row changed. Every transition is auditable. */
export const StandingReason = {
  EARNED: "EARNED",
  VOUCHED: "VOUCHED",
  FOUNDING: "FOUNDING",
  SUSPENDED: "SUSPENDED",
  DEMOTED: "DEMOTED",
  REINSTATED: "REINSTATED",
} as const;
export type StandingReason = (typeof StandingReason)[keyof typeof StandingReason];

/** How a `PostTopic` was derived. Deterministic tagger — FEED-RANKING.md §3. */
export const TopicSource = {
  AUTHOR_OCCUPATION: "AUTHOR_OCCUPATION",
  HASHTAG: "HASHTAG",
  COMPANY: "COMPANY",
  TEXT_MATCH: "TEXT_MATCH",
  GOVERNORATE: "GOVERNORATE",
} as const;
export type TopicSource = (typeof TopicSource)[keyof typeof TopicSource];

/**
 * Behaviour signals that move `InterestWeight`. Message content is deliberately
 * absent and must stay absent — FEED-RANKING.md §2.
 */
export const SignalKind = {
  POST_EXPAND: "POST_EXPAND",
  POST_DWELL: "POST_DWELL",
  LINK_CLICK: "LINK_CLICK",
  PROFILE_VISIT: "PROFILE_VISIT",
  SEARCH_QUERY: "SEARCH_QUERY",
  JOB_APPLY: "JOB_APPLY",
  NOT_INTERESTED: "NOT_INTERESTED",
  HIDE_POST: "HIDE_POST",
} as const;
export type SignalKind = (typeof SignalKind)[keyof typeof SignalKind];

/** Whether a job requirement is a knockout or a preference — MATCHING.md §2. */
export const RequirementLevel = {
  MUST: "MUST",
  NICE: "NICE",
} as const;
export type RequirementLevel = (typeof RequirementLevel)[keyof typeof RequirementLevel];

export const JobLocationMode = {
  ONSITE: "ONSITE",
  HYBRID: "HYBRID",
  REMOTE: "REMOTE",
} as const;
export type JobLocationMode = (typeof JobLocationMode)[keyof typeof JobLocationMode];

export const BookmarkType = {
  POST: "POST",
  JOB: "JOB",
} as const;
export type BookmarkType = (typeof BookmarkType)[keyof typeof BookmarkType];

export const ApplicationStatus = {
  SUBMITTED: "SUBMITTED",
  REVIEWING: "REVIEWING",
  SHORTLISTED: "SHORTLISTED",
  REJECTED: "REJECTED",
  HIRED: "HIRED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

/**
 * Why an application was rejected. Required on every REJECTED transition — in a
 * market with far more applicants than openings, silence is the dominant
 * complaint and the cheapest one to fix.
 */
export const RejectionReason = {
  POSITION_FILLED: "POSITION_FILLED",
  EXPERIENCE_INSUFFICIENT: "EXPERIENCE_INSUFFICIENT",
  SKILLS_MISMATCH: "SKILLS_MISMATCH",
  LOCATION: "LOCATION",
  QUALIFICATION_MISSING: "QUALIFICATION_MISSING",
  APPLIED_AFTER_CLOSING: "APPLIED_AFTER_CLOSING",
  OTHER: "OTHER",
} as const;
export type RejectionReason = (typeof RejectionReason)[keyof typeof RejectionReason];

/** Free text is what makes OTHER mean anything, so it is required with it. */
export const REJECTION_NOTE_MAX = 500;

export const ReportReason = {
  SPAM: "SPAM",
  HARASSMENT: "HARASSMENT",
  HATE: "HATE",
  MISINFORMATION: "MISINFORMATION",
  NUDITY: "NUDITY",
  VIOLENCE: "VIOLENCE",
  OTHER: "OTHER",
} as const;
export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];

export const CompanyMemberRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
} as const;
export type CompanyMemberRole = (typeof CompanyMemberRole)[keyof typeof CompanyMemberRole];

// Error codes returned by the API. Keep flat and stable — clients map to i18n keys.
export const ErrorCode = {
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  ACCOUNT_DELETED_PENDING_RESTORE: "ACCOUNT_DELETED_PENDING_RESTORE",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
  /** Moderator suspension — `User.isActive = false`. Distinct from deletion. */
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  BLOCKED: "BLOCKED",
  INTERNAL: "INTERNAL",
  MEDIA_TYPE_REJECTED: "MEDIA_TYPE_REJECTED",
  MEDIA_SIZE_REJECTED: "MEDIA_SIZE_REJECTED",
  STREAM_TOKEN_INVALID: "STREAM_TOKEN_INVALID",
  PROFILE_ONBOARDING_REQUIRED: "PROFILE_ONBOARDING_REQUIRED",
  PROFILE_HANDLE_TAKEN: "PROFILE_HANDLE_TAKEN",
  CONNECTION_SELF: "CONNECTION_SELF",
  CONNECTION_DUPLICATE: "CONNECTION_DUPLICATE",
  CONNECTION_BLOCKED: "CONNECTION_BLOCKED",
  POST_EMPTY: "POST_EMPTY",
  MEDIA_TOO_LARGE: "MEDIA_TOO_LARGE",
  MEDIA_UNSUPPORTED: "MEDIA_UNSUPPORTED",
  JOB_CLOSED: "JOB_CLOSED",
  APPLICATION_DUPLICATE: "APPLICATION_DUPLICATE",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
