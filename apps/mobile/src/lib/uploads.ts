import {
  MediaKind,
  PresignedUpload,
  type MediaPurpose,
  type PresignUploadBody,
} from "@baydar/shared";

import { apiFetch } from "./api";

export interface PickedAsset {
  uri: string;
  mimeType: string;
  sizeBytes: number;
  filename?: string;
}

export interface UploadedAsset {
  publicUrl: string;
  blurhash: string | null;
}

// Presign → direct PUT (via fetch+Blob) → return public URL.
export async function uploadAsset(args: {
  asset: PickedAsset;
  purpose: MediaPurpose;
  token: string;
}): Promise<UploadedAsset> {
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

  return {
    publicUrl: signed.publicUrl,
    blurhash: signed.blurhash,
  };
}
