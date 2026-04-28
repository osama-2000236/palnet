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

export const DevicePlatform = z.enum(["ios", "android"]);
export type DevicePlatform = z.infer<typeof DevicePlatform>;

export const RegisterDeviceTokenBody = z.object({
  token: z.string().min(1).max(512),
  platform: DevicePlatform,
});
export type RegisterDeviceTokenBody = z.infer<typeof RegisterDeviceTokenBody>;

// Server-sent event shapes for the /notifications/stream endpoint.
// ─────────────── Preferences ───────────────

// Channels a notification can land on. "in-app" is always delivered — the
// toggle controls whether it's surfaced as a ring/sound/dot vs. quietly
// recorded. Email + push gate the respective sends.
export const NotificationChannel = z.enum(["inApp", "email", "push"]);
export type NotificationChannel = z.infer<typeof NotificationChannel>;

// Event buckets shown in settings. Each maps internally to one or more
// NotificationType values on the server side.
export const NotificationEvent = z.enum([
  "connections",
  "messages",
  "reactions",
  "comments",
  "jobs",
]);
export type NotificationEvent = z.infer<typeof NotificationEvent>;

// Flat map: event -> channel -> enabled. Missing entries default to true
// server-side so new events stay opt-out until the user turns them off.
export const NotificationPreferences = z.object({
  inApp: z.object({
    connections: z.boolean(),
    messages: z.boolean(),
    reactions: z.boolean(),
    comments: z.boolean(),
    jobs: z.boolean(),
  }),
  email: z.object({
    connections: z.boolean(),
    messages: z.boolean(),
    reactions: z.boolean(),
    comments: z.boolean(),
    jobs: z.boolean(),
  }),
  push: z.object({
    connections: z.boolean(),
    messages: z.boolean(),
    reactions: z.boolean(),
    comments: z.boolean(),
    jobs: z.boolean(),
  }),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferences>;

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
