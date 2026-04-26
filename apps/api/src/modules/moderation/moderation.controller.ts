import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  type AdminReportItem,
  AdminReportExportQuery,
  AdminReportListQuery,
  type AdminReportPage,
  type AppealAck,
  AppealReportBody,
  type BlockedUserList,
  BlockUserBody,
  CreateReportBody,
  MyReportsListQuery,
  type MyReportsPage,
  type ReportAck,
  ResolveReportBody,
  UserRole,
} from "@baydar/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { AdminService } from "../admin/admin.service";
import { AllowSuspended } from "../auth/decorators/allow-suspended.decorator";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";

import { ModerationService } from "./moderation.service";

@ApiTags("moderation")
@ApiBearerAuth()
@Controller()
export class ModerationController {
  constructor(
    private readonly moderation: ModerationService,
    private readonly adminService: AdminService,
  ) {}

  // Viewer's own moderation history — resolved reports filed against their
  // content. Suspended users can read this so they know what to appeal.
  @Get("reports/mine")
  @AllowSuspended()
  async listMyReports(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(MyReportsListQuery)) query: MyReportsListQuery,
  ): Promise<MyReportsPage> {
    return this.moderation.listMyReports(user.id, query);
  }

  // User-side appeal — the one moderation action a suspended account must
  // still be able to take, hence @AllowSuspended().
  @Post("reports/:id/appeal")
  @AllowSuspended()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async fileAppeal(
    @CurrentUser() user: AuthUser,
    @Param("id") reportId: string,
    @Body(new ZodValidationPipe(AppealReportBody)) body: AppealReportBody,
  ): Promise<{ data: AppealAck }> {
    const data = await this.adminService.fileAppeal(user.id, reportId, body.note);
    return { data };
  }

  // Reports are expensive to triage and easy to weaponise by mass-filing —
  // tighter throttle than the global default.
  @Post("reports")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async createReport(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateReportBody)) body: CreateReportBody,
  ): Promise<{ data: ReportAck }> {
    const data = await this.moderation.createReport(user.id, body);
    return { data };
  }

  @Post("blocks")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async block(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(BlockUserBody)) body: BlockUserBody,
  ): Promise<void> {
    await this.moderation.block(user.id, body.userId);
  }

  @Delete("blocks/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblock(@CurrentUser() user: AuthUser, @Param("userId") userId: string): Promise<void> {
    await this.moderation.unblock(user.id, userId);
  }

  @Get("blocks")
  async listBlocks(@CurrentUser() user: AuthUser): Promise<{ data: BlockedUserList }> {
    const blocks = await this.moderation.listBlocks(user.id);
    return { data: { blocks } };
  }

  @Get("admin/reports")
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  async listAdminReports(
    @Query(new ZodValidationPipe(AdminReportListQuery))
    query: AdminReportListQuery,
  ): Promise<AdminReportPage> {
    return this.moderation.listReports(query);
  }

  @Get("admin/reports/export.csv")
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="moderation-reports.csv"')
  async exportAdminReports(
    @Query(new ZodValidationPipe(AdminReportExportQuery))
    query: AdminReportExportQuery,
  ): Promise<string> {
    return this.moderation.exportReportsCsv(query);
  }

  @Get("admin/reports/:id")
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  async getAdminReport(@Param("id") id: string): Promise<{ data: AdminReportItem }> {
    const data = await this.moderation.getReport(id);
    return { data };
  }

  @Post("admin/reports/:id/resolve")
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  async resolveAdminReport(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ResolveReportBody)) body: ResolveReportBody,
  ): Promise<{ data: AdminReportItem }> {
    const data = await this.moderation.resolveReport(id, user.id, body);
    return { data };
  }
}
