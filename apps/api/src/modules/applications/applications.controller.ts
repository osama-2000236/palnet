import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  type Application,
  CursorPageQuery,
  type CursorPageMeta,
  UpdateApplicationStatusBody,
} from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import {
  CurrentUser,
  type AuthUser,
} from "../auth/decorators/current-user.decorator";

import { ApplicationsService } from "./applications.service";

@ApiTags("applications")
@ApiBearerAuth()
@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get("me/applications")
  async listMine(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(CursorPageQuery)) query: CursorPageQuery,
  ): Promise<{ data: Application[]; meta: CursorPageMeta }> {
    return this.applications.listMine(user, query.after ?? null, query.limit);
  }

  @Get("companies/:id/jobs/:jobId/applications")
  async listForJob(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("jobId") jobId: string,
    @Query(new ZodValidationPipe(CursorPageQuery)) query: CursorPageQuery,
  ): Promise<{ data: Application[]; meta: CursorPageMeta }> {
    return this.applications.listForJob(
      user,
      id,
      jobId,
      query.after ?? null,
      query.limit,
    );
  }

  @Patch("applications/:id/status")
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateApplicationStatusBody))
    body: UpdateApplicationStatusBody,
  ): Promise<Application> {
    return this.applications.updateStatus(user, id, body);
  }
}
