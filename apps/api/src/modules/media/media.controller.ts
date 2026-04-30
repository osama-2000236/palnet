import { PresignUploadBody, type PresignedUpload } from "@baydar/shared";
import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { MediaService } from "./media.service";

@ApiTags("media")
@ApiBearerAuth()
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post("presign")
  async presign(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(PresignUploadBody)) body: PresignUploadBody,
  ): Promise<{ data: PresignedUpload }> {
    const data = await this.media.presign(user.id, body);
    return { data };
  }
}
