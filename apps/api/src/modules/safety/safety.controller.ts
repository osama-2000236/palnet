import {
  BlockBody,
  type BlockedUserDTO,
  CursorPageQuery,
  type CursorPageMeta,
  ReportBody,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { SafetyService } from "./safety.service";

@ApiTags("safety")
@ApiBearerAuth()
@RequireCompleteProfile()
@UseGuards(JwtAuthGuard)
@Controller()
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post("reports")
  @RateLimit("safetyAction")
  async report(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ReportBody)) body: ReportBody,
  ): Promise<{ data: { id: string; createdAt: string } }> {
    const data = await this.safety.report(user.id, body);
    return { data: { id: data.id, createdAt: data.createdAt.toISOString() } };
  }

  @Post("blocks")
  @RateLimit("safetyAction")
  async block(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(BlockBody)) body: BlockBody,
  ): Promise<{ data: { id: string; blockedUserId: string; createdAt: string } }> {
    const data = await this.safety.block(user.id, body.blockedUserId);
    return {
      data: {
        id: data.id,
        blockedUserId: data.blockedUserId,
        createdAt: data.createdAt.toISOString(),
      },
    };
  }

  @Delete("blocks/:blockedUserId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblock(
    @CurrentUser() user: AuthUser,
    @Param("blockedUserId") blockedUserId: string,
  ): Promise<void> {
    await this.safety.unblock(user.id, blockedUserId);
  }

  @Get("blocks")
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(CursorPageQuery)) query: CursorPageQuery,
  ): Promise<{ data: BlockedUserDTO[]; meta: CursorPageMeta }> {
    return this.safety.listBlocked(user.id, query.after ?? null, query.limit);
  }
}
