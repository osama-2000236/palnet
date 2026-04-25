import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  type AdminPostDetail,
  type AdminUserDetail,
  AuditLogExportQuery,
  type AuditLogPage,
  AuditLogListQuery,
  ReviewAppealBody,
  RestorePostBody,
  SuspendUserBody,
  TakedownPostBody,
  UnsuspendUserBody,
  UserRole,
} from "@palnet/shared";

import { CronOrAdminGuard } from "../../common/cron-or-admin.guard";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { Roles } from "../auth/decorators/roles.decorator";

import { AdminService } from "./admin.service";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ── Users ────────────────────────────────────────────────────────────

  @Post("users/:id/suspend")
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspendUser(
    @CurrentUser() actor: AuthUser,
    @Param("id") userId: string,
    @Body(new ZodValidationPipe(SuspendUserBody)) body: SuspendUserBody,
  ): Promise<void> {
    await this.admin.suspendUser(actor.id, userId, body);
  }

  @Get("users/:id")
  async getUserDetail(@Param("id") userId: string): Promise<AdminUserDetail> {
    return this.admin.getUserDetail(userId);
  }

  @Post("users/:id/unsuspend")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsuspendUser(
    @CurrentUser() actor: AuthUser,
    @Param("id") userId: string,
    @Body(new ZodValidationPipe(UnsuspendUserBody)) body: UnsuspendUserBody,
  ): Promise<void> {
    await this.admin.unsuspendUser(actor.id, userId, body);
  }

  // ── Posts ────────────────────────────────────────────────────────────

  @Post("posts/:id/takedown")
  @HttpCode(HttpStatus.NO_CONTENT)
  async takedownPost(
    @CurrentUser() actor: AuthUser,
    @Param("id") postId: string,
    @Body(new ZodValidationPipe(TakedownPostBody)) body: TakedownPostBody,
  ): Promise<void> {
    await this.admin.takedownPost(actor.id, postId, body);
  }

  @Get("posts/:id")
  async getPostDetail(@Param("id") postId: string): Promise<AdminPostDetail> {
    return this.admin.getPostDetail(postId);
  }

  @Post("posts/:id/restore")
  @HttpCode(HttpStatus.NO_CONTENT)
  async restorePost(
    @CurrentUser() actor: AuthUser,
    @Param("id") postId: string,
    @Body(new ZodValidationPipe(RestorePostBody)) body: RestorePostBody,
  ): Promise<void> {
    await this.admin.restorePost(actor.id, postId, body);
  }

  // ── Appeals ──────────────────────────────────────────────────────────

  @Post("reports/:id/appeal/review")
  @HttpCode(HttpStatus.NO_CONTENT)
  async reviewAppeal(
    @CurrentUser() actor: AuthUser,
    @Param("id") reportId: string,
    @Body(new ZodValidationPipe(ReviewAppealBody)) body: ReviewAppealBody,
  ): Promise<void> {
    await this.admin.reviewAppeal(actor.id, reportId, body);
  }

  // ── Audit log ────────────────────────────────────────────────────────

  @Get("audit")
  async listAudit(
    @Query(new ZodValidationPipe(AuditLogListQuery))
    query: AuditLogListQuery,
  ): Promise<AuditLogPage> {
    return this.admin.listAudit(query);
  }

  @Post("audit/prune")
  @HttpCode(HttpStatus.OK)
  @OptionalAuth()
  @Roles()
  @UseGuards(CronOrAdminGuard)
  async pruneAudit(
    @Query("days") days?: string,
  ): Promise<{ deleted: number; cutoff: string }> {
    // `days` is optional — defaults to 1 year inside the service. The
    // endpoint is gated by either an admin JWT or the Render cron secret.
    // Run it on a daily or weekly cadence.
    const parsed = days ? Number.parseInt(days, 10) : undefined;
    return this.admin.pruneAuditLogs(Number.isFinite(parsed) ? parsed : undefined);
  }

  @Get("audit/export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="audit-log.csv"')
  async exportAudit(
    @Query(new ZodValidationPipe(AuditLogExportQuery))
    query: AuditLogExportQuery,
  ): Promise<string> {
    return this.admin.exportAuditCsv(query);
  }
}
