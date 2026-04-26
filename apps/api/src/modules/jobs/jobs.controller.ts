import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  type ApplicationStatus,
  ApplyToJobBody,
  CursorPageQuery,
  type CursorPageMeta,
  type Job as JobDto,
  JobLocationMode,
  JobType,
  CreateJobBody,
  UpdateJobBody,
} from "@baydar/shared";
import { z } from "zod";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { JobsService } from "./jobs.service";

const JobListQuery = CursorPageQuery.extend({
  q: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  type: z.nativeEnum(JobType).optional(),
  locationMode: z.nativeEnum(JobLocationMode).optional(),
});
type JobListQuery = z.infer<typeof JobListQuery>;

@ApiTags("jobs")
@ApiBearerAuth()
@Controller()
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get("jobs")
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(JobListQuery)) query: JobListQuery,
  ): Promise<{ data: JobDto[]; meta: CursorPageMeta }> {
    return this.jobs.list(user, query.after ?? null, query.limit, {
      q: query.q ?? null,
      city: query.city ?? null,
      type: query.type ?? null,
      locationMode: query.locationMode ?? null,
    });
  }

  @Get("jobs/:id")
  async getOne(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<JobDto> {
    return this.jobs.getOne(user, id);
  }

  @Post("companies/:id/jobs")
  async create(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(CreateJobBody))
    body: CreateJobBody,
  ): Promise<JobDto> {
    return this.jobs.create(user, id, body);
  }

  @Patch("jobs/:id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateJobBody))
    body: UpdateJobBody,
  ): Promise<JobDto> {
    return this.jobs.update(user, id, body);
  }

  @Delete("jobs/:id")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<JobDto> {
    return this.jobs.remove(user, id);
  }

  @Post("jobs/:id/apply")
  async apply(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ApplyToJobBody))
    body: ApplyToJobBody,
  ): Promise<{ id: string; status: ApplicationStatus }> {
    return this.jobs.apply(user.id, id, body);
  }
}
