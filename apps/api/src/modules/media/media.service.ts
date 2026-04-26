import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ErrorCode,
  type HashedUpload,
  type PresignUploadBody,
  type PresignedUpload,
  type MediaPurpose,
} from "@baydar/shared";
import { encode as encodeBlurhash } from "blurhash";
import sharp from "sharp";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";

// Per-purpose size caps. Keeping this explicit discourages drift.
const PURPOSE_LIMITS: Record<MediaPurpose, { maxBytes: number; kinds: string[] }> = {
  AVATAR: { maxBytes: 2 * 1024 * 1024, kinds: ["IMAGE"] },
  COVER: { maxBytes: 5 * 1024 * 1024, kinds: ["IMAGE"] },
  POST_MEDIA: { maxBytes: 25 * 1024 * 1024, kinds: ["IMAGE", "VIDEO"] },
  COMPANY_LOGO: { maxBytes: 2 * 1024 * 1024, kinds: ["IMAGE"] },
  COMPANY_COVER: { maxBytes: 5 * 1024 * 1024, kinds: ["IMAGE"] },
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
      this.log.warn("R2 not configured — POST /media/presign will return MEDIA_NOT_CONFIGURED.");
    }
  }

  async presign(userId: string, body: PresignUploadBody): Promise<PresignedUpload> {
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

  // Download uploaded image, downsample, and encode as a blurhash placeholder.
  // SSRF guard: only fetch URLs that live under our configured R2 publicBase.
  async computeBlurhash(url: string): Promise<HashedUpload> {
    if (!this.publicBase) {
      throw new DomainException(
        ErrorCode.INTERNAL,
        "Media storage is not configured. Set R2_* env vars.",
        503,
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Invalid URL.", 400);
    }

    const base = new URL(this.publicBase);
    if (parsed.origin !== base.origin) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "URL must live under the configured media origin.",
        400,
      );
    }

    let buffer: Buffer;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new DomainException(ErrorCode.VALIDATION_FAILED, `Fetch failed: ${res.status}`, 400);
      }
      const ab = await res.arrayBuffer();
      buffer = Buffer.from(ab);
    } catch (err) {
      if (err instanceof DomainException) throw err;
      this.log.warn({ err, url }, "blurhash fetch failed");
      throw new DomainException(ErrorCode.INTERNAL, "Could not fetch media for hashing.", 502);
    }

    // 32×32 is blurhash's recommended downsample size — any larger is wasteful,
    // any smaller loses the low-frequency signal the placeholder needs.
    const { data, info } = await sharp(buffer)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: "inside" })
      .toBuffer({ resolveWithObject: true });

    // 4×3 components = ~30-char hash, good balance of detail vs. payload.
    const hash = encodeBlurhash(new Uint8ClampedArray(data), info.width, info.height, 4, 3);

    return { blurhash: hash };
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
