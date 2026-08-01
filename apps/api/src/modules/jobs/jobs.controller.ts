import {
  type ApplicationStatus,
  ApplyToJobBody,
  CreateJobAlertBody,
  CursorPageQuery,
  type CursorPageMeta,
  type Job as JobDto,
  type JobAlert as JobAlertDto,
  JobLocationMode,
  JobType,
  PS_GOVERNORATES,
  type PublicJob,
} from "@baydar/shared";
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
import { z } from "zod";

import {
  AllowIncompleteProfile,
  RequireCompleteProfile,
} from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";

import { JobAlertsService } from "./job-alerts.service";
import { JobsService } from "./jobs.service";

const JobListQuery = CursorPageQuery.extend({
  q: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  type: z.nativeEnum(JobType).optional(),
  locationMode: z.nativeEnum(JobLocationMode).optional(),
  companyId: z.string().cuid().optional(),
  industry: z.string().max(120).optional(),
  // Validated against the key list, so a typo 400s instead of quietly
  // returning every job in the country.
  governorate: z
    .string()
    .refine((key) => PS_GOVERNORATES.some((g) => g.key === key), "Unknown governorate.")
    .optional(),
});
type JobListQuery = z.infer<typeof JobListQuery>;

@ApiTags("jobs")
@ApiBearerAuth()
@RequireCompleteProfile()
@Controller("jobs")
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly jobAlerts: JobAlertsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(JobListQuery)) query: JobListQuery,
  ): Promise<{ data: JobDto[]; meta: CursorPageMeta }> {
    return this.jobs.list(user.id, query.after ?? null, query.limit, {
      q: query.q ?? null,
      city: query.city ?? null,
      type: query.type ?? null,
      locationMode: query.locationMode ?? null,
      companyId: query.companyId ?? null,
      industry: query.industry ?? null,
      governorate: query.governorate ?? null,
    });
  }

  // ── Job alerts (declared before ":id" so "alerts" isn't captured) ──────

  @Get("alerts")
  async listAlerts(@CurrentUser() user: AuthUser): Promise<{ data: JobAlertDto[] }> {
    return { data: await this.jobAlerts.list(user.id) };
  }

  @Post("alerts")
  @HttpCode(HttpStatus.CREATED)
  async createAlert(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateJobAlertBody)) body: CreateJobAlertBody,
  ): Promise<{ data: JobAlertDto }> {
    return { data: await this.jobAlerts.create(user.id, body) };
  }

  @Delete("alerts/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAlert(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.jobAlerts.remove(user.id, id);
  }

  // Declared before ":id" so "public" isn't swallowed by the param route.
  // Viewer-free DTO → public caching is safe (WhatsApp/OG share pages hit this).
  @Public()
  @AllowIncompleteProfile()
  @Get("public/:id")
  @Header("Cache-Control", "public, max-age=300")
  async getPublic(@Param("id") id: string): Promise<PublicJob> {
    return this.jobs.getPublic(id);
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  async getOne(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<JobDto> {
    return this.jobs.getOne(user.id, id);
  }

  @Post(":id/apply")
  async apply(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ApplyToJobBody)) body: ApplyToJobBody,
  ): Promise<{ id: string; status: ApplicationStatus }> {
    return this.jobs.apply(user.id, id, body);
  }
}
