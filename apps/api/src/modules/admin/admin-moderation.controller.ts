import { ErrorCode } from "@baydar/shared";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { DomainException } from "../../common/domain-exception";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { AdminModerationService } from "./admin-moderation.service";

const ModerationListQuery = z.object({
  status: z.enum(["open", "resolved", "all"]).default("open"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
type ModerationListQuery = z.infer<typeof ModerationListQuery>;

const ModerationActionBody = z.object({
  action: z.enum(["DISMISS", "WARN", "SUSPEND", "HARD_DELETE"]),
  note: z.string().max(1000).optional(),
});
type ModerationActionBody = z.infer<typeof ModerationActionBody>;

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin/moderation")
export class AdminModerationController {
  constructor(private readonly moderation: AdminModerationService) {}

  @Get("reports")
  async listReports(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(ModerationListQuery)) query: ModerationListQuery,
  ) {
    requireModerator(user);
    return this.moderation.listReports(query.status, query.limit);
  }

  @Get("reports/:id")
  async getReport(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    requireModerator(user);
    return this.moderation.getReport(id);
  }

  @Post("reports/:id/actions")
  async act(
    @CurrentUser() user: AuthUser,
    @Param("id") reportId: string,
    @Body(new ZodValidationPipe(ModerationActionBody)) body: ModerationActionBody,
  ) {
    requireModerator(user);
    return this.moderation.act({
      actorId: user.id,
      reportId,
      action: body.action,
      note: body.note,
    });
  }
}

function requireModerator(user: AuthUser): void {
  if (user.role === "ADMIN" || user.role === "MODERATOR") return;
  throw new DomainException(ErrorCode.AUTH_FORBIDDEN, "Moderator role required.", 403);
}
