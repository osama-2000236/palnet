import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ErrorCode,
  type PresignUploadBody,
  type PresignedUpload,
  type MediaPurpose,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";

// Per-purpose size caps. Keeping this explicit discourages drift.
const PURPOSE_LIMITS: Record<MediaPurpose, { maxBytes: number; kinds: string[] }> = {
  AVATAR: { maxBytes: 2 * 1024 * 1024, kinds: ["IMAGE"] },
  COVER: { maxBytes: 5 * 1024 * 1024, kinds: ["IMAGE"] },
  POST_MEDIA: { maxBytes: 25 * 1024 * 1024, kinds: ["IMAGE", "VIDEO"] },
};

const PRESIGN_TTL_SECONDS = 60 * 5; // 5 minutes

@Injectable()
export class MediaService {
  private readonly log = new Logger(MediaService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly publicBase: string | null;

  constructor(private readonly config: ConfigService<Env, true>) {
    const accountId = this.config.get("R2_ACCOUNT_ID", { infer: true });
    const accessKeyId = this.config.get("R2_ACCESS_KEY_ID", { infer: true });
    const secretAccessKey = this.config.get("R2_SECRET_ACCESS_KEY", { infer: true });
    const bucket = this.config.get("R2_BUCKET", { infer: true });
    const publicUrl = this.config.get("R2_PUBLIC_URL", { infer: true });

    if (accountId && accessKeyId && secretAccessKey && bucket && publicUrl) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.bucket = bucket;
      this.publicBase = publicUrl.replace(/\/$/, "");
    } else {
      this.client = null;
      this.bucket = null;
      this.publicBase = null;
      this.log.warn(
        "R2 not configured — POST /media/presign will return MEDIA_NOT_CONFIGURED.",
      );
    }
  }

  async presign(
    userId: string,
    body: PresignUploadBody,
  ): Promise<PresignedUpload> {
    if (!this.client || !this.bucket || !this.publicBase) {
      throw new DomainException(
        ErrorCode.INTERNAL,
        "Media storage is not configured. Set R2_* env vars.",
        503,
      );
    }

    const limits = PURPOSE_LIMITS[body.purpose];
    if (!limits.kinds.includes(body.kind)) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        `Kind ${body.kind} not allowed for purpose ${body.purpose}.`,
        400,
      );
    }
    if (body.sizeBytes > limits.maxBytes) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        `File exceeds ${limits.maxBytes} bytes for purpose ${body.purpose}.`,
        400,
      );
    }

    const ext = extensionFor(body.filename, body.mimeType);
    const key = `${body.purpose.toLowerCase()}/${userId}/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: body.mimeType,
      ContentLength: body.sizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGN_TTL_SECONDS,
    });

    return {
      uploadUrl,
      publicUrl: `${this.publicBase}/${key}`,
      key,
      headers: { "Content-Type": body.mimeType },
      expiresAt: new Date(Date.now() + PRESIGN_TTL_SECONDS * 1000).toISOString(),
    };
  }
}

// Preserve extension from filename if provided; otherwise derive from MIME.
function extensionFor(filename: string | undefined, mimeType: string): string {
  if (filename) {
    const m = /(\.[a-zA-Z0-9]{1,8})$/.exec(filename);
    if (m) return m[1]!.toLowerCase();
  }
  const lookup: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "application/pdf": ".pdf",
  };
  return lookup[mimeType.toLowerCase()] ?? "";
}
