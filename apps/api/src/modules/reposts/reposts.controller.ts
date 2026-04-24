import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CreateRepostBody } from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { RepostsService } from "./reposts.service";

@ApiTags("reposts")
@ApiBearerAuth()
@Controller("posts/:id/reposts")
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class RepostsController {
  constructor(private readonly reposts: RepostsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(CreateRepostBody))
    body: CreateRepostBody,
  ): Promise<void> {
    await this.reposts.create(user.id, id, body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<void> {
    await this.reposts.delete(user.id, id);
  }
}
