import { z } from "zod";
import { NotificationType } from "../enums";

export const Notification = z.object({
  id: z.string().cuid(),
  type: z.nativeEnum(NotificationType),
  actorId: z.string().cuid().nullable(),
  postId: z.string().cuid().nullable(),
  commentId: z.string().cuid().nullable(),
  connectionId: z.string().cuid().nullable(),
  messageId: z.string().cuid().nullable(),
  jobId: z.string().cuid().nullable(),
  data: z.record(z.unknown()).nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  actor: z
    .object({
      id: z.string().cuid(),
      handle: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      avatarUrl: z.string().url().nullable(),
    })
    .nullable(),
});
export type Notification = z.infer<typeof Notification>;

export const MarkNotificationsReadBody = z
  .object({
    ids: z.array(z.string().cuid()).min(1).max(200).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => !!v.ids || v.all === true, { message: "IDS_OR_ALL_REQUIRED" });
export type MarkNotificationsReadBody = z.infer<typeof MarkNotificationsReadBody>;

// Server-sent event shapes for the /notifications/stream endpoint.
export const WsNotificationEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("notification.new"), payload: Notification }),
  z.object({
    type: z.literal("notification.read"),
    payload: z.object({
      ids: z.array(z.string().cuid()),
      at: z.string().datetime(),
    }),
  }),
  z.object({
    type: z.literal("notification.unread-count"),
    payload: z.object({ count: z.number().int().nonnegative() }),
  }),
]);
export type WsNotificationEvent = z.infer<typeof WsNotificationEvent>;
