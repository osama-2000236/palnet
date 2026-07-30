import {
  ApplicationStatus,
  CreateJobBodyBase,
  CursorPageQuery,
  type CursorPageMeta,
  type EmployerApplicant,
  type EmployerJob,
  UpdateApplicationStatusBody,
  UpdateJobBody,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { CompaniesService } from "./companies.service";
import { CompanyRoleGuard, RequireCompanyRole } from "./guards/company-role.guard";

const CompanyJobListQuery = CursorPageQuery.extend({
  status: z.enum(["active", "archived", "all"]).default("active"),
});
type CompanyJobListQuery = z.infer<typeof CompanyJobListQuery>;

const ApplicantListQuery = CursorPageQuery.extend({
  status: z.nativeEnum(ApplicationStatus).optional(),
});
type ApplicantListQuery = z.infer<typeof ApplicantListQuery>;

const CreateJobBodyForCompany = CreateJobBodyBase.omit({ companyId: true });

@ApiTags("companies")
@ApiBearerAuth()
@RequireCompleteProfile()
@UseGuards(CompanyRoleGuard)
@Controller("companies/:companyId/jobs")
export class CompanyJobsController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @RequireCompanyRole("OWNER", "ADMIN", "EDITOR")
  async list(
    @Param("companyId") companyId: string,
    @Query(new ZodValidationPipe(CompanyJobListQuery)) query: CompanyJobListQuery,
  ): Promise<{ data: EmployerJob[]; meta: CursorPageMeta }> {
    return this.companies.listCompanyJobs(
      companyId,
      query.after ?? null,
      query.limit,
      query.status,
    );
  }

  @Post()
  @RequireCompanyRole("OWNER", "ADMIN", "EDITOR")
  async create(
    @CurrentUser() user: AuthUser,
    @Param("companyId") companyId: string,
    @Body(new ZodValidationPipe(CreateJobBodyForCompany))
    body: z.infer<typeof CreateJobBodyForCompany>,
  ): Promise<EmployerJob> {
    return this.companies.createJob(companyId, user.id, body);
  }

  @Patch(":jobId")
  @RequireCompanyRole("OWNER", "ADMIN", "EDITOR")
  async update(
    @Param("companyId") companyId: string,
    @Param("jobId") jobId: string,
    @Body(new ZodValidationPipe(UpdateJobBody)) body: UpdateJobBody,
  ): Promise<EmployerJob> {
    return this.companies.updateJob(companyId, jobId, body);
  }

  @Post(":jobId/archive")
  @RequireCompanyRole("OWNER", "ADMIN", "EDITOR")
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param("companyId") companyId: string,
    @Param("jobId") jobId: string,
  ): Promise<EmployerJob> {
    return this.companies.archiveJob(companyId, jobId);
  }

  @Get(":jobId/applicants")
  @RequireCompanyRole("OWNER", "ADMIN", "EDITOR")
  async listApplicants(
    @Param("companyId") companyId: string,
    @Param("jobId") jobId: string,
    @Query(new ZodValidationPipe(ApplicantListQuery)) query: ApplicantListQuery,
  ): Promise<{ data: EmployerApplicant[]; meta: CursorPageMeta }> {
    return this.companies.listApplicants(
      companyId,
      jobId,
      query.after ?? null,
      query.limit,
      query.status ?? null,
    );
  }

  @Patch(":jobId/applicants/:applicationId")
  @RequireCompanyRole("OWNER", "ADMIN", "EDITOR")
  async updateApplicantStatus(
    @CurrentUser() actor: AuthUser,
    @Param("companyId") companyId: string,
    @Param("jobId") jobId: string,
    @Param("applicationId") applicationId: string,
    @Body(new ZodValidationPipe(UpdateApplicationStatusBody)) body: UpdateApplicationStatusBody,
  ): Promise<EmployerApplicant> {
    return this.companies.updateApplicantStatus(companyId, jobId, applicationId, actor.id, body);
  }
}
