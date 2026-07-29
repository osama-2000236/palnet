import { z } from "zod";

import { Email } from "./auth";

export const DeleteAccountBody = z.object({
  confirmation: z.literal("DELETE_MY_ACCOUNT"),
});
export type DeleteAccountBody = z.infer<typeof DeleteAccountBody>;

export const RestoreAccountBody = z.object({
  email: Email,
  password: z.string().min(1),
  deviceId: z.string().min(1).max(128).default("restore"),
});
export type RestoreAccountBody = z.infer<typeof RestoreAccountBody>;

const JsonRecord = z.record(z.string(), z.unknown());

export const AccountExportEnvelope = z.object({
  exportedAt: z.string().datetime(),
  userId: z.string(),
  profile: JsonRecord.nullable(),
  posts: z.array(JsonRecord),
  comments: z.array(JsonRecord),
  reactions: z.array(JsonRecord),
  reposts: z.array(JsonRecord),
  chatRoomMembers: z.array(JsonRecord),
  messages: z.array(JsonRecord),
  notifications: z.array(JsonRecord),
  blockedUsers: z.array(JsonRecord),
  reports: z.array(JsonRecord),
});
export type AccountExportEnvelope = z.infer<typeof AccountExportEnvelope>;

// Privacy settings had a schema here for a `/me/privacy` endpoint that was
// never built — no controller, no Prisma column, no consumer once the web form
// that 500'd on every load was replaced by the read-only contract both clients
// now render. Deleted rather than kept as a promise; re-add it beside the
// controller that serves it.

// Active session
export const ActiveSession = z.object({
  id: z.string(),
  device: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  lastActiveAt: z.string().datetime(),
});
export type ActiveSession = z.infer<typeof ActiveSession>;
