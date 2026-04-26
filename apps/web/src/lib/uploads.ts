import {
  MediaKind,
  PresignedUpload,
  type MediaPurpose,
  type PresignUploadBody,
} from "@baydar/shared";

import { apiFetch } from "./api";

// Presign → direct PUT → return the public URL. Two network hops, no
// bytes touch our API server.
export async function uploadFile(args: {
  file: File;
  purpose: MediaPurpose;
  token: string;
}): Promise<string> {
  const { file, purpose, token } = args;

  const kind: MediaKind = file.type.startsWith("video/")
    ? MediaKind.VIDEO
    : file.type.startsWith("image/")
      ? MediaKind.IMAGE
      : MediaKind.DOCUMENT;

  const body: PresignUploadBody = {
    purpose,
    kind,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    filename: file.name,
  };

  const signed = await apiFetch("/media/presign", PresignedUpload, {
    method: "POST",
    body,
    token,
  });

  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: signed.headers,
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Upload failed: ${put.status}`);
  }

  return signed.publicUrl;
}
