import { Module } from "@nestjs/common";

import { BillingModule } from "../billing/billing.module";
import { JobsModule } from "../jobs/jobs.module";
import { PrismaModule } from "../prisma/prisma.module";

import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";
import { CompanyJobsController } from "./company-jobs.controller";
import { CompanyMembersController } from "./company-members.controller";
import { CompanyRoleGuard } from "./guards/company-role.guard";

@Module({
  imports: [PrismaModule, BillingModule, JobsModule],
  controllers: [CompaniesController, CompanyMembersController, CompanyJobsController],
  providers: [CompaniesService, CompanyRoleGuard],
})
export class CompaniesModule {}
