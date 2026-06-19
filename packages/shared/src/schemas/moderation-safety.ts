import { z } from "zod";

import { ReportReason } from "../enums";

const TargetFields = {
  targetUserId: z.string().cuid().optional(),
  targetPostId: z.string().cuid().optional(),
  targetCommentId: z.string().cuid().optional(),
  targetMessageId: z.string().cuid().optional(),
};

export const ReportTarget = z
  .object(TargetFields)
  .refine((body) => Object.values(body).some(Boolean), {
    message: "At least one report target is required.",
  });
export type ReportTarget = z.infer<typeof ReportTarget>;

export const ReportBody = z
  .object({
    reason: z.nativeEnum(ReportReason),
    details: z.string().max(2000).optional(),
    ...TargetFields,
  })
  .refine(
    (body) =>
      Boolean(
        body.targetUserId ?? body.targetPostId ?? body.targetCommentId ?? body.targetMessageId,
      ),
    { message: "At least one report target is required." },
  );
export type ReportBody = z.infer<typeof ReportBody>;

export const BlockBody = z.object({
  blockedUserId: z.string().cuid(),
});
export type BlockBody = z.infer<typeof BlockBody>;

export const BlockedUserDTO = z.object({
  id: z.string().cuid(),
  blockedUserId: z.string().cuid(),
  blockedHandle: z.string(),
  blockedDisplayName: z.string(),
  blockedAvatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});
export type BlockedUserDTO = z.infer<typeof BlockedUserDTO>;
