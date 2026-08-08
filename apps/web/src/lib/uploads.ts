import {
  CompletedUpload,
  MediaKind,
  MultipartUpload,
  PresignedUpload,
  runResumableUpload,
  shouldUseMultipart,
  SignedMultipartPart,
  partRange,
  type MediaPurpose,
  type PresignUploadBody,
  type ResumableUploadReceipt,
} from "@baydar/shared";

import { apiFetch } from "./api";

// Presign → direct PUT → return the public URL. Two network hops, no
// bytes touch our API server.
//
// Above one part, the upload becomes resumable instead: a 20 MB video at
// 30 kbit/s is an hour and a half, and losing all of it to one dropped socket
// is not a failure a member on 2G will tolerate twice.

function kindOf(file: File): MediaKind {
  if (file.type.startsWith("video/")) return MediaKind.VIDEO;
  if (file.type.startsWith("image/")) return MediaKind.IMAGE;
  return MediaKind.DOCUMENT;
}

const bodyFor = (file: File, purpose: MediaPurpose): PresignUploadBody => ({
  purpose,
  kind: kindOf(file),
  mimeType: file.type || "application/octet-stream",
  sizeBytes: file.size,
  filename: file.name,
});

export async function uploadFile(args: {
  file: File;
  purpose: MediaPurpose;
  token: string;
  /** A receipt from an interrupted attempt, and a place to keep the new one. */
  resumeFrom?: ResumableUploadReceipt | null;
  onProgress?: (receipt: ResumableUploadReceipt, done: number, total: number) => void;
}): Promise<string> {
  const { file, purpose, token } = args;

  if (shouldUseMultipart(file.size)) {
    const { publicUrl } = await runResumableUpload({
      resumeFrom: args.resumeFrom,
      onProgress: args.onProgress,
      transport: {
        start: async () => {
          const plan = await apiFetch("/media/multipart", MultipartUpload, {
            method: "POST",
            body: bodyFor(file, purpose),
            token,
          });
          return plan;
        },
        signPart: async (receipt, partNumber) => {
          const signed = await apiFetch(
            `/media/multipart/${encodeURIComponent(receipt.uploadId)}/part`,
            SignedMultipartPart,
            { method: "POST", body: { key: receipt.key, partNumber }, token },
          );
          return signed.uploadUrl;
        },
        putPart: async (url, partNumber, receipt) => {
          const { start, end } = partRange(receipt, partNumber, file.size);
          const put = await fetch(url, { method: "PUT", body: file.slice(start, end) });
          if (!put.ok) throw new Error(`Part ${partNumber} failed: ${put.status}`);
          // R2 quotes the ETag, and CompleteMultipartUpload wants it back
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
    return publicUrl;
  }

  const signed = await apiFetch("/media/presign", PresignedUpload, {
    method: "POST",
    body: bodyFor(file, purpose),
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
