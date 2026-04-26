import { z } from "zod";

import { MediaKind } from "../enums";

// Where the uploaded asset will live in the product surface. Drives the
// storage key prefix and public URL path.
export const MediaPurpose = z.enum(["AVATAR", "COVER", "POST_MEDIA"]);
export type MediaPurpose = z.infer<typeof MediaPurpose>;

// ──────────────────────────────────────────────────────────────────────────
// Presign request / response
// ──────────────────────────────────────────────────────────────────────────

// Client calls POST /media/presign with intended metadata; server returns
// a short-lived direct-to-R2 upload URL.
export const PresignUploadBody = z.object({
  purpose: MediaPurpose,
  kind: z.nativeEnum(MediaKind),
  mimeType: z
    .string()
    .regex(/^[\w.+-]+\/[\w.+-]+$/, { message: "INVALID_MIME" })
    .max(100),
  // Client-declared size guardrail. Server enforces a hard cap per purpose.
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024), // 25 MB ceiling
  // Optional filename hint — used only to preserve extension in the key.
  filename: z.string().max(255).optional(),
});
export type PresignUploadBody = z.infer<typeof PresignUploadBody>;

export const PresignedUpload = z.object({
  // PUT this URL with the raw bytes + required headers.
  uploadUrl: z.string().url(),
  // Public, cacheable URL once the upload completes (safe to persist to DB).
  publicUrl: z.string().url(),
  // Object key inside the bucket — handy for debugging / admin tooling.
  key: z.string(),
  // Headers the client MUST include on the PUT. Content-Type is always here.
  headers: z.record(z.string()),
  // ISO timestamp past which the uploadUrl stops working.
  expiresAt: z.string().datetime(),
});
export type PresignedUpload = z.infer<typeof PresignedUpload>;
