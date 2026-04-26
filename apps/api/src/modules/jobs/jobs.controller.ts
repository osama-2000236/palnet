import {
  type ApplicationStatus,
  ApplyToJobBody,
  CursorPageQuery,
  type CursorPageMeta,
  type Job as JobDto,
  JobLocationMode,
  JobType,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { ZodValidationPipe } from "../../common/zod-pipe";
import {
  CurrentUser,
  type AuthUser,
} from "../auth/decorators/current-user.decorator";

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
@Controller("jobs")
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

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
    });
  }

  @Get(":id")
  async getOne(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<JobDto> {
    return this.jobs.getOne(user.id, id);
  }

  @Post(":id/apply")
  @UsePipes(new ZodValidationPipe(ApplyToJobBody))
  async apply(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: ApplyToJobBody,
  ): Promise<{ id: string; status: ApplicationStatus }> {
    return this.jobs.apply(user.id, id, body);
  }
}
