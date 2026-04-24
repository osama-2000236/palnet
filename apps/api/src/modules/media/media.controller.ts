import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  HashUploadBody,
  type HashedUpload,
  PresignUploadBody,
  type PresignedUpload,
} from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { MediaService } from "./media.service";

@ApiTags("media")
@ApiBearerAuth()
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post("presign")
  // Presign is cheap but each one commits an upload slot; cap at 30/min.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async presign(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(PresignUploadBody))
    body: PresignUploadBody,
  ): Promise<{ data: PresignedUpload }> {
    const data = await this.media.presign(user.id, body);
    return { data };
  }

  @Post("hash")
  async hash(
    @CurrentUser() _user: AuthUser,
    @Body(new ZodValidationPipe(HashUploadBody))
    body: HashUploadBody,
  ): Promise<{ data: HashedUpload }> {
    const data = await this.media.computeBlurhash(body.url);
    return { data };
  }
}
