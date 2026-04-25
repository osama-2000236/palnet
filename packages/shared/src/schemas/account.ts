import { z } from "zod";

import { Email, Password } from "./auth";

// Change the signed-in user's email. Current password is required so a
// stolen access token alone can't hijack the account's recovery channel.
export const ChangeEmailBody = z.object({
  newEmail: Email,
  currentPassword: z.string().min(1),
});
export type ChangeEmailBody = z.infer<typeof ChangeEmailBody>;

// Rotate the password. Confirm the current one to defend against drive-by
// token theft; reject if the new password matches the old.
export const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: Password,
});
export type ChangePasswordBody = z.infer<typeof ChangePasswordBody>;

// Soft-delete the account. Requires password + typed confirmation phrase
// ("DELETE") so accidental double-clicks don't nuke a profile.
export const DeleteAccountBody = z.object({
  currentPassword: z.string().min(1),
  confirmation: z.literal("DELETE"),
});
export type DeleteAccountBody = z.infer<typeof DeleteAccountBody>;

// One row of GET /account/sessions — a live refresh token backing a device.
export const SessionInfo = z.object({
  id: z.string().cuid(),
  deviceId: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  current: z.boolean(),
});
export type SessionInfo = z.infer<typeof SessionInfo>;

export const SessionList = z.object({
  sessions: z.array(SessionInfo),
});
export type SessionList = z.infer<typeof SessionList>;

// Body for POST /account/sessions/revoke-all — client hands us its own
// deviceId so we can keep the current session alive (or, if omitted, purge
// everything including the caller).
export const RevokeAllSessionsBody = z.object({
  keepDeviceId: z.string().min(1).max(128).optional(),
});
export type RevokeAllSessionsBody = z.infer<typeof RevokeAllSessionsBody>;

// Push-token registration. The mobile client obtains an Expo push token
// on boot (after login) and hands it here; we upsert by (userId, deviceId)
// so tokens rotating on the device don't leak stale rows. `platform` is
// the concrete platform string Expo reports — kept free-form because the
// Expo SDK already normalises "ios"/"android"/"web".
export const RegisterPushTokenBody = z.object({
  deviceId: z.string().min(1).max(128),
  token: z.string().min(1).max(512),
  platform: z.enum(["ios", "android", "web"]),
});
export type RegisterPushTokenBody = z.infer<typeof RegisterPushTokenBody>;

export const AccountExportResponse = z.object({
  status: z.enum(["sent", "queued"]),
});
export type AccountExportResponse = z.infer<typeof AccountExportResponse>;
