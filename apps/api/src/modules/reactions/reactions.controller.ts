import { SetReactionBody } from "@baydar/shared";
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { ReactionsService } from "./reactions.service";

@ApiTags("reactions")
@ApiBearerAuth()
@Controller("posts/:id/reaction")
export class ReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(SetReactionBody))
  async set(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: SetReactionBody,
  ): Promise<void> {
    await this.reactions.set(user.id, id, body.type);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<void> {
    await this.reactions.clear(user.id, id);
  }
}
