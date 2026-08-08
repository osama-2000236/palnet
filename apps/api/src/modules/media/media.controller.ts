import {
  CompleteMultipartUploadBody,
  MediaScanRequest,
  PresignUploadBody,
  SignMultipartPartBody,
  StartMultipartUploadBody,
  type CompletedUpload,
  type MediaScanResult,
  type MultipartUpload,
  type PresignedUpload,
  type SignedMultipartPart,
} from "@baydar/shared";
import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { MediaMultipartService } from "./media-multipart.service";
import { MediaScanService } from "./media-scan.service";
import { MediaService } from "./media.service";

@ApiTags("media")
@ApiBearerAuth()
@Controller("media")
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly multipart: MediaMultipartService,
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

  /**
   * Begin a resumable upload.
   *
   * Separate from `presign` rather than a flag on it: multipart costs three
   * extra round trips, which is the wrong trade for a small image on the very
   * connection this exists to help. The client picks by size.
   */
  @Post("multipart")
  @RateLimit("media")
  async startMultipart(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(StartMultipartUploadBody)) body: StartMultipartUploadBody,
  ): Promise<{ data: MultipartUpload }> {
    const data = await this.multipart.startMultipart(user.id, body);
    return { data };
  }

  @Post("multipart/:uploadId/part")
  @RateLimit("media")
  async signPart(
    @CurrentUser() user: AuthUser,
    @Param("uploadId") uploadId: string,
    @Body(new ZodValidationPipe(SignMultipartPartBody)) body: SignMultipartPartBody,
  ): Promise<{ data: SignedMultipartPart }> {
    const data = await this.multipart.signMultipartPart(user.id, uploadId, body);
    return { data };
  }

  @Post("multipart/:uploadId/complete")
  @RateLimit("media")
  async completeMultipart(
    @CurrentUser() user: AuthUser,
    @Param("uploadId") uploadId: string,
    @Body(new ZodValidationPipe(CompleteMultipartUploadBody)) body: CompleteMultipartUploadBody,
  ): Promise<{ data: CompletedUpload }> {
    const data = await this.multipart.completeMultipart(user.id, uploadId, body);
    return { data };
  }

  /** Abandon an upload so its parts stop being stored and billed. */
  @Delete("multipart/:uploadId")
  @RateLimit("media")
  @HttpCode(HttpStatus.NO_CONTENT)
  async abortMultipart(
    @CurrentUser() user: AuthUser,
    @Param("uploadId") uploadId: string,
    @Query("key") key: string,
  ): Promise<void> {
    await this.multipart.abortMultipart(user.id, uploadId, key);
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
