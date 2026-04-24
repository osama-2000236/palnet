import { z } from "zod";

import { AppealStatus, ReportReason } from "../enums";
import { CursorPageQuery, cursorPage } from "../pagination";

const AppealStatusEnumForReport = z.nativeEnum(AppealStatus);

// ──────────────────────────────────────────────────────────────────────────
// Reports
// ──────────────────────────────────────────────────────────────────────────
//
// Reports are filed by the viewer against a single target — a user, post,
// comment, or message. Exactly one target field must be set; the API will
// 400 if zero or more than one arrives. We keep the discriminator on the
// wire instead of deriving it so the payload stays grep-able in logs.

export const ReportReasonEnum = z.nativeEnum(ReportReason);

export const ReportTargetKind = z.enum(["USER", "POST", "COMMENT", "MESSAGE"]);
export type ReportTargetKind = z.infer<typeof ReportTargetKind>;

export const CreateReportBody = z
  .object({
    targetKind: ReportTargetKind,
    targetId: z.string().cuid(),
    reason: ReportReasonEnum,
    // Free-text context. Kept short so triage isn't a wall of text.
    details: z.string().trim().max(1000).optional(),
  })
  .strict();
export type CreateReportBody = z.infer<typeof CreateReportBody>;

export const ReportAck = z.object({
  id: z.string().cuid(),
  createdAt: z.string().datetime(),
});
export type ReportAck = z.infer<typeof ReportAck>;

// ──────────────────────────────────────────────────────────────────────────
// Blocks
// ──────────────────────────────────────────────────────────────────────────
//
// Blocking is viewer → target (one direction on the wire) but enforced
// symmetrically in queries — if either party blocks the other, neither sees
// the other's posts/profiles/messages. The public surface is simple:
//   POST /blocks       { userId }
//   DELETE /blocks/:id            ← unblock by the blocked userId
//   GET  /blocks                   ← who I'm blocking

export const BlockUserBody = z
  .object({
    userId: z.string().cuid(),
  })
  .strict();
export type BlockUserBody = z.infer<typeof BlockUserBody>;

// One row in the /blocks list — denormalised enough that the UI can render
// a name + handle + avatar without a second fetch.
export const BlockedUserItem = z.object({
  userId: z.string().cuid(),
  handle: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});
export type BlockedUserItem = z.infer<typeof BlockedUserItem>;

export const BlockedUserList = z.object({
  blocks: z.array(BlockedUserItem),
});
export type BlockedUserList = z.infer<typeof BlockedUserList>;

// ──────────────────────────────────────────────────────────────────────────
// Admin triage
// ──────────────────────────────────────────────────────────────────────────

export const AdminReportStatus = z.enum(["open", "resolved", "all"]);
export type AdminReportStatus = z.infer<typeof AdminReportStatus>;

const AdminReportAuditText = z.string().trim().min(1).max(120).optional();
const AdminReportAuditDate = z.string().datetime().optional();

export const AdminReportListQuery = CursorPageQuery.extend({
  status: AdminReportStatus.default("open"),
  targetKind: ReportTargetKind.optional(),
  reason: ReportReasonEnum.optional(),
  reporter: AdminReportAuditText,
  resolver: AdminReportAuditText,
  createdFrom: AdminReportAuditDate,
  createdTo: AdminReportAuditDate,
  resolvedFrom: AdminReportAuditDate,
  resolvedTo: AdminReportAuditDate,
});
export type AdminReportListQuery = z.infer<typeof AdminReportListQuery>;

export const AdminReportExportQuery = AdminReportListQuery.omit({
  after: true,
  limit: true,
}).extend({
  limit: z.coerce.number().int().min(1).max(500).default(500),
});
export type AdminReportExportQuery = z.infer<typeof AdminReportExportQuery>;

export const AdminReportActor = z.object({
  userId: z.string().cuid(),
  handle: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type AdminReportActor = z.infer<typeof AdminReportActor>;

export const AdminReportTargetPreview = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("available"),
    kind: ReportTargetKind,
    id: z.string().cuid(),
    label: z.string(),
    excerpt: z.string().nullable(),
    author: AdminReportActor.nullable(),
  }),
  z.object({
    state: z.literal("unavailable"),
    kind: ReportTargetKind,
    id: z.string().cuid(),
    label: z.literal("unavailable"),
    excerpt: z.null(),
    author: z.null(),
  }),
]);
export type AdminReportTargetPreview = z.infer<typeof AdminReportTargetPreview>;

export const AdminReportItem = z.object({
  id: z.string().cuid(),
  reporter: AdminReportActor,
  reason: ReportReasonEnum,
  details: z.string().nullable(),
  targetKind: ReportTargetKind,
  targetId: z.string().cuid(),
  target: AdminReportTargetPreview,
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  resolvedNote: z.string().nullable(),
  resolvedBy: AdminReportActor.nullable(),
  // Appeal state — populated only once the target user files one via
  // POST /reports/:id/appeal. PENDING → UPHELD | DENIED after review.
  appealedAt: z.string().datetime().nullable(),
  appealNote: z.string().nullable(),
  appealStatus: AppealStatusEnumForReport.nullable(),
  appealDecisionNote: z.string().nullable(),
  appealReviewedAt: z.string().datetime().nullable(),
  appealReviewedBy: AdminReportActor.nullable(),
});
export type AdminReportItem = z.infer<typeof AdminReportItem>;

export const AdminReportPage = cursorPage(AdminReportItem);
export type AdminReportPage = z.infer<typeof AdminReportPage>;

export const ResolveReportBody = z
  .object({
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
export type ResolveReportBody = z.infer<typeof ResolveReportBody>;

// ──────────────────────────────────────────────────────────────────────────
// User-facing view of reports filed against a viewer's own content. This
// exists so the viewer can (a) see what was actioned and why, and (b) file
// an appeal. Reporter identity and resolver identity are intentionally
// stripped — reporters get privacy, moderators speak with one voice.
// ──────────────────────────────────────────────────────────────────────────

export const MyReportItem = z.object({
  id: z.string().cuid(),
  reason: ReportReasonEnum,
  targetKind: ReportTargetKind,
  targetId: z.string().cuid(),
  target: AdminReportTargetPreview,
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  resolvedNote: z.string().nullable(),
  appealedAt: z.string().datetime().nullable(),
  appealNote: z.string().nullable(),
  appealStatus: AppealStatusEnumForReport.nullable(),
  appealDecisionNote: z.string().nullable(),
  appealReviewedAt: z.string().datetime().nullable(),
});
export type MyReportItem = z.infer<typeof MyReportItem>;

export const MyReportsListQuery = CursorPageQuery.extend({});
export type MyReportsListQuery = z.infer<typeof MyReportsListQuery>;

export const MyReportsPage = cursorPage(MyReportItem);
export type MyReportsPage = z.infer<typeof MyReportsPage>;
