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
  PROFILE_VIEW: "PROFILE_VIEW",
  // Moderation outcomes visible to the affected user. Payload in `data`:
  //   MODERATION_USER_SUSPENDED   — { reason: string }
  //   MODERATION_USER_UNSUSPENDED — { note?: string }
  //   MODERATION_POST_TAKEDOWN    — { postId: string, reason: string }
  //   MODERATION_POST_RESTORED    — { postId: string, note?: string }
  //   MODERATION_APPEAL_REVIEWED  — { reportId: string, decision: "UPHELD"|"DENIED", note?: string }
  MODERATION_USER_SUSPENDED: "MODERATION_USER_SUSPENDED",
  MODERATION_USER_UNSUSPENDED: "MODERATION_USER_UNSUSPENDED",
  MODERATION_POST_TAKEDOWN: "MODERATION_POST_TAKEDOWN",
  MODERATION_POST_RESTORED: "MODERATION_POST_RESTORED",
  MODERATION_APPEAL_REVIEWED: "MODERATION_APPEAL_REVIEWED",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const JobType = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACT",
  INTERNSHIP: "INTERNSHIP",
  VOLUNTEER: "VOLUNTEER",
  TEMPORARY: "TEMPORARY",
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobLocationMode = {
  ONSITE: "ONSITE",
  HYBRID: "HYBRID",
  REMOTE: "REMOTE",
} as const;
export type JobLocationMode = (typeof JobLocationMode)[keyof typeof JobLocationMode];

export const ApplicationStatus = {
  SUBMITTED: "SUBMITTED",
  REVIEWING: "REVIEWING",
  SHORTLISTED: "SHORTLISTED",
  REJECTED: "REJECTED",
  HIRED: "HIRED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const ReportReason = {
  SPAM: "SPAM",
  HARASSMENT: "HARASSMENT",
  HATE_SPEECH: "HATE_SPEECH",
  VIOLENCE: "VIOLENCE",
  ADULT_CONTENT: "ADULT_CONTENT",
  IMPERSONATION: "IMPERSONATION",
  OTHER: "OTHER",
} as const;
export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];

export const AppealStatus = {
  PENDING: "PENDING",
  UPHELD: "UPHELD",
  DENIED: "DENIED",
} as const;
export type AppealStatus = (typeof AppealStatus)[keyof typeof AppealStatus];

export const AuditAction = {
  USER_SUSPEND: "USER_SUSPEND",
  USER_UNSUSPEND: "USER_UNSUSPEND",
  POST_TAKEDOWN: "POST_TAKEDOWN",
  POST_RESTORE: "POST_RESTORE",
  REPORT_RESOLVE: "REPORT_RESOLVE",
  REPORT_APPEAL_REVIEW: "REPORT_APPEAL_REVIEW",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

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
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
  PROFILE_HANDLE_TAKEN: "PROFILE_HANDLE_TAKEN",
  CONNECTION_SELF: "CONNECTION_SELF",
  CONNECTION_DUPLICATE: "CONNECTION_DUPLICATE",
  CONNECTION_BLOCKED: "CONNECTION_BLOCKED",
  POST_EMPTY: "POST_EMPTY",
  MEDIA_TOO_LARGE: "MEDIA_TOO_LARGE",
  MEDIA_UNSUPPORTED: "MEDIA_UNSUPPORTED",
  JOB_CLOSED: "JOB_CLOSED",
  APPLICATION_DUPLICATE: "APPLICATION_DUPLICATE",
  USER_SUSPENDED: "USER_SUSPENDED",
  POST_TAKEN_DOWN: "POST_TAKEN_DOWN",
  APPEAL_ALREADY_FILED: "APPEAL_ALREADY_FILED",
  APPEAL_NOT_FOUND: "APPEAL_NOT_FOUND",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
