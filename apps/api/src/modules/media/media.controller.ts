import {
  MediaScanRequest,
  PresignUploadBody,
  type MediaScanResult,
  type PresignedUpload,
} from "@baydar/shared";
import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { MediaScanService } from "./media-scan.service";
import { MediaService } from "./media.service";

@ApiTags("media")
@ApiBearerAuth()
@Controller("media")
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly scan: MediaScanService,
  ) {}

  @Post("presign")
  @RateLimit("media")
  async presign(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(PresignUploadBody)) body: PresignUploadBody,
  ): Promise<{ data: PresignedUpload }> {
    const data = await this.media.presign(user.id, body);
    return { data };
  }

  // Client calls this after a successful presigned PUT to R2. Scanners
  // (ClamAV + Cloudflare Images) run inline and the response is the canonical
  // signal for the UI to allow downstream usage (e.g., posting an avatar,
  // attaching to a bank-transfer receipt). Consumers should refuse to persist
  // a URL whose scan returned status !== "READY".
  @Post("confirm")
  @RateLimit("media")
  async confirm(
    @Body(new ZodValidationPipe(MediaScanRequest)) body: MediaScanRequest,
  ): Promise<{ data: MediaScanResult }> {
    const data = await this.scan.scanObject(body);
    return { data };
  }
}
