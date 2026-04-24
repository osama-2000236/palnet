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
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
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

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
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
