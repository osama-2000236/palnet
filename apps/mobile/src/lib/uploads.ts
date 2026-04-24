import {
  HashedUpload,
  MediaKind,
  PresignedUpload,
  type MediaPurpose,
  type PresignUploadBody,
} from "@palnet/shared";

import { apiFetch } from "./api";

export interface PickedAsset {
  uri: string;
  mimeType: string;
  sizeBytes: number;
  filename?: string;
}

// Presign → direct PUT (via fetch+Blob) → return public URL.
export async function uploadAsset(args: {
  asset: PickedAsset;
  purpose: MediaPurpose;
  token: string;
}): Promise<string> {
  const { asset, purpose, token } = args;

  const kind: MediaKind = asset.mimeType.startsWith("video/")
    ? MediaKind.VIDEO
    : asset.mimeType.startsWith("image/")
      ? MediaKind.IMAGE
      : MediaKind.DOCUMENT;

  const body: PresignUploadBody = {
    purpose,
    kind,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    filename: asset.filename,
  };

  const signed = await apiFetch("/media/presign", PresignedUpload, {
    method: "POST",
    body,
    token,
  });

  // Read the local file URI into a Blob so fetch can PUT it.
  const local = await fetch(asset.uri);
  const blob = await local.blob();

  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: signed.headers,
    body: blob,
  });
  if (!put.ok) {
    throw new Error(`Upload failed: ${put.status}`);
  }

  return signed.publicUrl;
}

// Upload + blurhash in one shot. Hash failure is non-fatal.
export async function uploadImageAsset(args: {
  asset: PickedAsset;
  purpose: MediaPurpose;
  token: string;
}): Promise<{ publicUrl: string; blurhash: string | null }> {
  const publicUrl = await uploadAsset(args);
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
