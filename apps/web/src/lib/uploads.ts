import {
  HashedUpload,
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

// Upload + blurhash in one shot. Failure of the hash step is non-fatal —
// the image itself is still uploaded and usable without a placeholder.
export async function uploadImage(args: {
  file: File;
  purpose: MediaPurpose;
  token: string;
}): Promise<{ publicUrl: string; blurhash: string | null }> {
  const publicUrl = await uploadFile(args);
  try {
    const hashed = await apiFetch("/media/hash", HashedUpload, {
      method: "POST",
      body: { url: publicUrl },
      token: args.token,
    });
    return { publicUrl, blurhash: hashed.blurhash };
  } catch {
    return { publicUrl, blurhash: null };
  }
}
