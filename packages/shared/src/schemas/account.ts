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
