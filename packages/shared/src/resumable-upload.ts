// Resumable uploads, for a connection that drops.
//
// A 2 MB photo at 30 kbit/s is about nine minutes. A drop at minute eight
// currently loses all of it, and on Gaza's 2G a drop at minute eight is not an
// edge case — it is Tuesday.
//
// The loop below uploads one part, records its ETag, and moves on. A drop
// costs the part in flight and nothing else: the caller keeps the receipt and
// hands it back next time, so the upload resumes where it stopped rather than
// where it started.
//
// One implementation for both platforms. What differs is where a part's bytes
// come from — a `Blob.slice` in a browser, a file read on a phone — so that is
// the one thing injected.

import { MULTIPART_MIN_BYTES } from "./schemas/media";

/**
 * What the caller keeps between attempts.
 *
 * Persisted alongside the outbox entry that owns the upload, which is why it
 * is plain JSON: `structuredClone` and `JSON.parse` both have to round-trip it
 * intact or a resume is a restart.
 */
export interface ResumableUploadReceipt {
  uploadId: string;
  key: string;
  publicUrl: string;
  partBytes: number;
  partCount: number;
  /** Parts already committed, by part number. */
  etags: Record<number, string>;
}

export interface ResumableUploadTransport {
  /** POST /media/multipart — begins the upload and returns the plan. */
  start(): Promise<Omit<ResumableUploadReceipt, "etags">>;
  /** POST /media/multipart/:uploadId/part — a fresh URL for one part. */
  signPart(receipt: ResumableUploadReceipt, partNumber: number): Promise<string>;
  /** PUT the bytes. Resolves with the part's ETag. */
  putPart(url: string, partNumber: number, receipt: ResumableUploadReceipt): Promise<string>;
  /** POST /media/multipart/:uploadId/complete — commits every part. */
  complete(receipt: ResumableUploadReceipt): Promise<string>;
}

export interface ResumableUploadOptions {
  transport: ResumableUploadTransport;
  /** Called after every committed part so the caller can persist the receipt. */
  onProgress?: (receipt: ResumableUploadReceipt, done: number, total: number) => void;
  /** A receipt from a previous attempt. Absent starts a new upload. */
  resumeFrom?: ResumableUploadReceipt | null;
}

/** True when multipart is worth its three extra round trips. */
export const shouldUseMultipart = (sizeBytes: number): boolean => sizeBytes >= MULTIPART_MIN_BYTES;

/**
 * Upload every part that is not already committed, then complete.
 *
 * Sequential, not parallel: on a link this slow, parallel parts share the same
 * few kilobits and every one of them finishes later than sending them in turn
 * would have. It also keeps the receipt honest — one part in flight means at
 * most one part lost.
 *
 * A part is signed immediately before it is sent, because a signature lives
 * five minutes and an upload on 2G does not.
 */
export async function runResumableUpload(
  options: ResumableUploadOptions,
): Promise<{ publicUrl: string; receipt: ResumableUploadReceipt }> {
  const { transport, onProgress } = options;

  const receipt: ResumableUploadReceipt = options.resumeFrom ?? {
    ...(await transport.start()),
    etags: {},
  };

  for (let partNumber = 1; partNumber <= receipt.partCount; partNumber += 1) {
    if (receipt.etags[partNumber]) continue;

    const url = await transport.signPart(receipt, partNumber);
    receipt.etags[partNumber] = await transport.putPart(url, partNumber, receipt);
    onProgress?.(receipt, Object.keys(receipt.etags).length, receipt.partCount);
  }

  return { publicUrl: await transport.complete(receipt), receipt };
}

/** Byte range of one 1-based part, for whichever slicing the platform has. */
export function partRange(
  receipt: Pick<ResumableUploadReceipt, "partBytes">,
  partNumber: number,
  sizeBytes: number,
): { start: number; end: number } {
  const start = (partNumber - 1) * receipt.partBytes;
  return { start, end: Math.min(start + receipt.partBytes, sizeBytes) };
}
