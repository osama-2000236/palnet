import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ErrorCode,
  MULTIPART_PART_BYTES,
  type CompleteMultipartUploadBody,
  type CompletedUpload,
  type MultipartUpload,
  type PresignUploadBody,
  type SignMultipartPartBody,
  type SignedMultipartPart,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";

import { MediaService, PRESIGN_TTL_SECONDS, blurhashFor } from "./media.service";

/**
 * Resumable uploads.
 *
 * Its own service because it changes for a different reason than
 * `MediaService`: this file moves when the upload protocol does, that one when
 * the MIME allow-list or the size caps do. It reuses that service's validation
 * so a resumable upload cannot become the way around either.
 */
@Injectable()
export class MediaMultipartService {
  constructor(private readonly media: MediaService) {}

  /**
   * Begin a resumable upload.
   *
   * The client uploads one part at a time and remembers which ones committed,
   * so a drop costs the part in flight rather than the whole file. That is the
   * difference between losing nine minutes and losing one on a 2G connection.
   */
  async startMultipart(userId: string, body: PresignUploadBody): Promise<MultipartUpload> {
    const { key, mimeType } = this.media.validateAndKey(userId, body);

    const created = await this.media.storageClient().send(
      new CreateMultipartUploadCommand({
        Bucket: this.media.bucketName(),
        Key: key,
        ContentType: mimeType,
      }),
    );
    if (!created.UploadId) {
      throw new DomainException(ErrorCode.INTERNAL, "Storage did not return an upload id.", 502);
    }

    return {
      uploadId: created.UploadId,
      key,
      publicUrl: `${this.media.publicBaseUrl()}/${key}`,
      partBytes: MULTIPART_PART_BYTES,
      partCount: Math.max(1, Math.ceil(body.sizeBytes / MULTIPART_PART_BYTES)),
      blurhash: mimeType.startsWith("image/") ? blurhashFor(key) : null,
    };
  }

  /**
   * Sign one part.
   *
   * Signed per part, not all at once: on 2G the whole upload can outlive a
   * batch of five-minute URLs, and re-signing one part is a 200-byte request
   * while re-signing the set is the reason the upload failed.
   */
  async signMultipartPart(
    userId: string,
    uploadId: string,
    body: SignMultipartPartBody,
  ): Promise<SignedMultipartPart> {
    assertOwnKey(userId, body.key);
    const uploadUrl = await getSignedUrl(
      this.media.storageClient(),
      new UploadPartCommand({
        Bucket: this.media.bucketName(),
        Key: body.key,
        UploadId: uploadId,
        PartNumber: body.partNumber,
      }),
      { expiresIn: PRESIGN_TTL_SECONDS },
    );
    return {
      uploadUrl,
      partNumber: body.partNumber,
      expiresAt: new Date(Date.now() + PRESIGN_TTL_SECONDS * 1000).toISOString(),
    };
  }

  async completeMultipart(
    userId: string,
    uploadId: string,
    body: CompleteMultipartUploadBody,
  ): Promise<CompletedUpload> {
    assertOwnKey(userId, body.key);
    await this.media.storageClient().send(
      new CompleteMultipartUploadCommand({
        Bucket: this.media.bucketName(),
        Key: body.key,
        UploadId: uploadId,
        MultipartUpload: {
          // S3 requires ascending part numbers; a client that retried out of
          // order would otherwise get InvalidPartOrder rather than its file.
          Parts: [...body.parts]
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
        },
      }),
    );
    return { publicUrl: `${this.media.publicBaseUrl()}/${body.key}` };
  }

  /** Abandon an upload so its parts stop being billed. */
  async abortMultipart(userId: string, uploadId: string, key: string): Promise<void> {
    assertOwnKey(userId, key);
    await this.media.storageClient().send(
      new AbortMultipartUploadCommand({
        Bucket: this.media.bucketName(),
        Key: key,
        UploadId: uploadId,
      }),
    );
  }
}

/**
 * A key is only ever the caller's own.
 *
 * Keys are `purpose/userId/uuid.ext`, so this is a prefix check rather than a
 * lookup. Without it, a member who learned another member's key could sign a
 * part against it and overwrite their upload — the key travels in the request
 * body, so it is attacker-controlled.
 */
function assertOwnKey(userId: string, key: string): void {
  const segments = key.split("/");
  if (segments.length < 3 || segments[1] !== userId) {
    throw new DomainException(ErrorCode.AUTH_FORBIDDEN, "That upload is not yours.", 403);
  }
}
