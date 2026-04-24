// Admin-depth schemas: suspensions, takedowns, appeals, audit log.
//
// Wire contract for moderator/admin surfaces layered on top of the base
// report triage from `moderation.ts`. Every mutating endpoint here must be
// gated by `@Roles("MODERATOR","ADMIN")` on the API side and must append
// an AuditLog row. The read surfaces (audit list + CSV export) are also
// admin-only and paginate via the standard cursor envelope.

import { z } from "zod";

import { AppealStatus, AuditAction } from "../enums";
import { CursorPageQuery, cursorPage } from "../pagination";

export const AppealStatusEnum = z.nativeEnum(AppealStatus);
export const AuditActionEnum = z.nativeEnum(AuditAction);

// ──────────────────────────────────────────────────────────────────────────
// User suspension
// ──────────────────────────────────────────────────────────────────────────

export const SuspendUserBody = z
  .object({
    // Short operator note. Shows up in audit log + (optionally) the
    // suspended user's own "your account is suspended" banner.
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export type SuspendUserBody = z.infer<typeof SuspendUserBody>;

export const UnsuspendUserBody = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .strict();
export type UnsuspendUserBody = z.infer<typeof UnsuspendUserBody>;

// ──────────────────────────────────────────────────────────────────────────
// Post takedown / restore
// ──────────────────────────────────────────────────────────────────────────

export const TakedownPostBody = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export type TakedownPostBody = z.infer<typeof TakedownPostBody>;

export const RestorePostBody = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .strict();
export type RestorePostBody = z.infer<typeof RestorePostBody>;

// ──────────────────────────────────────────────────────────────────────────
// Report appeals
// ──────────────────────────────────────────────────────────────────────────
//
// User-side: file one appeal per report they were on the wrong end of.
// Admin-side: mark it UPHELD (reverse the action) or DENIED (keep it).

export const AppealReportBody = z
  .object({
    note: z.string().trim().min(1).max(1000),
  })
  .strict();
export type AppealReportBody = z.infer<typeof AppealReportBody>;

export const ReviewAppealBody = z
  .object({
    decision: z.enum(["UPHELD", "DENIED"]),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
export type ReviewAppealBody = z.infer<typeof ReviewAppealBody>;

export const AppealAck = z.object({
  id: z.string().cuid(),
  appealedAt: z.string().datetime(),
  appealStatus: AppealStatusEnum,
});
export type AppealAck = z.infer<typeof AppealAck>;

// ──────────────────────────────────────────────────────────────────────────
// Audit log — read + export
// ──────────────────────────────────────────────────────────────────────────

export const AuditActor = z.object({
  userId: z.string().cuid(),
  handle: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type AuditActor = z.infer<typeof AuditActor>;

export const AuditLogItem = z.object({
  id: z.string().cuid(),
  action: AuditActionEnum,
  actor: AuditActor,
  targetUserId: z.string().cuid().nullable(),
  targetPostId: z.string().cuid().nullable(),
  targetReportId: z.string().cuid().nullable(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AuditLogItem = z.infer<typeof AuditLogItem>;

const AuditSearchText = z.string().trim().min(1).max(120).optional();
const AuditSearchDate = z.string().datetime().optional();

export const AuditLogListQuery = CursorPageQuery.extend({
  action: AuditActionEnum.optional(),
  actor: AuditSearchText,
  targetUserId: z.string().cuid().optional(),
  targetPostId: z.string().cuid().optional(),
  targetReportId: z.string().cuid().optional(),
  createdFrom: AuditSearchDate,
  createdTo: AuditSearchDate,
});
export type AuditLogListQuery = z.infer<typeof AuditLogListQuery>;

export const AuditLogExportQuery = AuditLogListQuery.omit({
  after: true,
  limit: true,
}).extend({
  limit: z.coerce.number().int().min(1).max(500).default(500),
});
export type AuditLogExportQuery = z.infer<typeof AuditLogExportQuery>;

export const AuditLogPage = cursorPage(AuditLogItem);
export type AuditLogPage = z.infer<typeof AuditLogPage>;
