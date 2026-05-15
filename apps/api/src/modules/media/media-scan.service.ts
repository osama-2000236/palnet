import {
  type MediaScanRequest,
  type MediaScanResult,
  type MediaScannerResult,
} from "@baydar/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

type ScannerName = "clamav" | "cloudflareImages";

@Injectable()
export class MediaScanService {
  private readonly log = new Logger(MediaScanService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async scanObject(body: MediaScanRequest): Promise<MediaScanResult> {
    const scanners: Partial<Record<ScannerName, MediaScannerResult>> = {};
    const reasons: string[] = [];

    scanners.clamav = await this.scanClamAv(body);
    if (scanners.clamav.status === "blocked") reasons.push(scanners.clamav.reason ?? "VIRUS");

    scanners.cloudflareImages = await this.scanCloudflareImages(body);
    if (scanners.cloudflareImages.status === "blocked") {
      reasons.push(scanners.cloudflareImages.reason ?? "UNSAFE_IMAGE");
    }

    const values = Object.values(scanners);
    const hasBlocked = values.some((result) => result.status === "blocked");
    const hasError = values.some((result) => result.status === "error");
    const allSkipped = values.every((result) => result.status === "skipped");

    return {
      key: body.key,
      status: hasBlocked
        ? "BLOCKED"
        : hasError
          ? "REVIEW_REQUIRED"
          : allSkipped
            ? "SKIPPED"
            : "READY",
      reasons,
      scanners: scanners as Record<ScannerName, MediaScannerResult>,
    };
  }

  private async scanClamAv(body: MediaScanRequest): Promise<MediaScannerResult> {
    const url = this.config.get("CLAMAV_SCAN_URL", { infer: true });
    if (!url) return { status: "skipped", reason: "CLAMAV_SCAN_URL not configured" };

    try {
      const payload = await postJson(url, body);
      const clean = payload.clean === true || payload.status === "clean";
      if (clean) return { status: "clean" };
      return {
        status: "blocked",
        reason: typeof payload.virus === "string" ? payload.virus : "VIRUS_DETECTED",
      };
    } catch (error) {
      this.log.warn(`ClamAV scan failed for ${body.key}: ${messageFor(error)}`);
      return { status: "error", reason: "CLAMAV_SCAN_FAILED" };
    }
  }

  private async scanCloudflareImages(body: MediaScanRequest): Promise<MediaScannerResult> {
    const url = this.config.get("CLOUDFLARE_IMAGES_SCAN_URL", { infer: true });
    if (!url) return { status: "skipped", reason: "CLOUDFLARE_IMAGES_SCAN_URL not configured" };
    if (!body.mimeType.startsWith("image/")) return { status: "skipped", reason: "NOT_IMAGE" };

    try {
      const payload = await postJson(url, body);
      const tags = Array.isArray(payload.tags) ? payload.tags.map(String) : [];
      const unsafe =
        payload.adult === true ||
        payload.nsfw === true ||
        tags.some((tag) => ["adult", "nudity", "nsfw", "porn"].includes(tag.toLowerCase()));
      if (!unsafe) return { status: "clean" };
      return { status: "blocked", reason: "ADULT_OR_UNSAFE_IMAGE" };
    } catch (error) {
      this.log.warn(`Cloudflare Images scan failed for ${body.key}: ${messageFor(error)}`);
      return { status: "error", reason: "CLOUDFLARE_IMAGES_SCAN_FAILED" };
    }
  }
}

async function postJson(url: string, body: MediaScanRequest): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  return json && typeof json === "object" ? (json as Record<string, unknown>) : {};
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
