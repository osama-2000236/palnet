import { z } from "zod";

import { ConnectionStatus } from "../enums";

export const SendConnectionBody = z.object({
  receiverId: z.string().cuid(),
  message: z.string().max(300).optional(),
});
export type SendConnectionBody = z.infer<typeof SendConnectionBody>;

export const RespondConnectionBody = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
});
export type RespondConnectionBody = z.infer<typeof RespondConnectionBody>;

// A short public projection of a user/profile for connection lists.
export const ConnectionUser = z.object({
  userId: z.string().cuid(),
  handle: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  headline: z.string().nullish(),
  avatarUrl: z.string().url().nullish(),
});
export type ConnectionUser = z.infer<typeof ConnectionUser>;

export const Connection = z.object({
  id: z.string().cuid(),
  requesterId: z.string().cuid(),
  receiverId: z.string().cuid(),
  status: z.nativeEnum(ConnectionStatus),
  message: z.string().nullable(),
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
});
export type Connection = z.infer<typeof Connection>;

// Entry returned in the "my connections" list — the *other* party plus the
// connection row that joins us.
export const ConnectionListItem = z.object({
  connectionId: z.string().cuid(),
  status: z.nativeEnum(ConnectionStatus),
  direction: z.enum(["OUTGOING", "INCOMING"]),
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
  message: z.string().nullable(),
  user: ConnectionUser,
});
export type ConnectionListItem = z.infer<typeof ConnectionListItem>;

// A single "people you may know" row — the lightweight projection used by the
// feed right rail and the /network suggestions tab. Reuses ConnectionUser so
// both web and (Sprint 5) mobile consume the same shape.
export const PersonSuggestion = z.object({
  user: ConnectionUser,
  /** Short token-backed reason string, e.g. "SHARED_CONNECTIONS". */
  reasonCode: z.enum(["SHARED_CONNECTIONS", "SAME_LOCATION", "SUGGESTED"]).default("SUGGESTED"),
  /** Optional numeric hint shown next to the reason (e.g. shared-count). */
  reasonCount: z.number().int().nonnegative().nullish(),
});
export type PersonSuggestion = z.infer<typeof PersonSuggestion>;

// Viewer-scoped connection state between the viewer and another user.
// Used on profile pages and anywhere we need a single badge.
export const ViewerConnectionState = z.object({
  // null → not connected, no pending
  status: z.nativeEnum(ConnectionStatus).nullable(),
  // direction of the *most recent* row, or null
  direction: z.enum(["OUTGOING", "INCOMING", "SELF"]).nullable(),
  connectionId: z.string().cuid().nullable(),
});
export type ViewerConnectionState = z.infer<typeof ViewerConnectionState>;
