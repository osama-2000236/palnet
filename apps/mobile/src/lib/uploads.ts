import {
  CompletedUpload,
  MediaKind,
  MultipartUpload,
  partRange,
  PresignedUpload,
  runResumableUpload,
  shouldUseMultipart,
  SignedMultipartPart,
  type MediaPurpose,
  type PresignUploadBody,
  type ResumableUploadReceipt,
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
//
// Above one part, the upload becomes resumable instead: a 20 MB video at
// 30 kbit/s is an hour and a half, and losing all of it to one dropped socket
// is not a failure a member on 2G will tolerate twice.
export async function uploadAsset(args: {
  asset: PickedAsset;
  purpose: MediaPurpose;
  token: string;
  /** A receipt from an interrupted attempt, and a place to keep the new one. */
  resumeFrom?: ResumableUploadReceipt | null;
  onProgress?: (receipt: ResumableUploadReceipt, done: number, total: number) => void;
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

  if (shouldUseMultipart(asset.sizeBytes)) {
    // One read of the whole asset, sliced per part. React Native has no
    // random-access file read that returns bytes, and re-reading the file for
    // every part would cost more than the upload.
    const whole = await (await fetch(asset.uri)).blob();
    let blurhash: string | null = null;

    const { publicUrl } = await runResumableUpload({
      resumeFrom: args.resumeFrom,
      onProgress: args.onProgress,
      transport: {
        start: async () => {
          const plan = await apiFetch("/media/multipart", MultipartUpload, {
            method: "POST",
            body,
            token,
          });
          blurhash = plan.blurhash;
          return plan;
        },
        signPart: async (receipt, partNumber) => {
          const signedPart = await apiFetch(
            `/media/multipart/${encodeURIComponent(receipt.uploadId)}/part`,
            SignedMultipartPart,
            { method: "POST", body: { key: receipt.key, partNumber }, token },
          );
          return signedPart.uploadUrl;
        },
        putPart: async (url, partNumber, receipt) => {
          const { start, end } = partRange(receipt, partNumber, asset.sizeBytes);
          const put = await fetch(url, { method: "PUT", body: whole.slice(start, end) });
          if (!put.ok) throw new Error(`Part ${partNumber} failed: ${put.status}`);
          // R2 quotes the ETag and CompleteMultipartUpload wants it back
          // exactly as given — stripping the quotes is an InvalidPart.
          const etag = put.headers.get("etag");
          if (!etag) throw new Error(`Part ${partNumber} returned no ETag`);
          return etag;
        },
        complete: async (receipt) => {
          const done = await apiFetch(
            `/media/multipart/${encodeURIComponent(receipt.uploadId)}/complete`,
            CompletedUpload,
            {
              method: "POST",
              body: {
                key: receipt.key,
                parts: Object.entries(receipt.etags).map(([partNumber, etag]) => ({
                  partNumber: Number(partNumber),
                  etag,
                })),
              },
              token,
            },
          );
          return done.publicUrl;
        },
      },
    });

    return { publicUrl, blurhash };
  }

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
