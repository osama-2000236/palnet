import {
  type Company as CompanyDto,
  type CompanySummary,
  CreateCompanyBody,
  UpdateCompanyBody,
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
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { OptionalUser } from "../auth/decorators/optional-user.decorator";

import { CompaniesService } from "./companies.service";
import { CompanyRoleGuard, RequireCompanyRole } from "./guards/company-role.guard";

@ApiTags("companies")
@ApiBearerAuth()
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get("me")
  @RequireCompleteProfile()
  async listMine(@CurrentUser() user: AuthUser): Promise<CompanySummary[]> {
    return this.companies.listForViewer(user.id);
  }

  @Post()
  @RequireCompleteProfile()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateCompanyBody)) body: CreateCompanyBody,
  ): Promise<CompanyDto> {
    return this.companies.create(user.id, body);
  }

  @Get(":idOrSlug")
  @OptionalAuth()
  @Header("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
  async getOne(
    @OptionalUser() user: AuthUser | null,
    @Param("idOrSlug") idOrSlug: string,
  ): Promise<CompanyDto> {
    return this.companies.findByIdOrSlug(user?.id ?? null, idOrSlug);
  }

  @Patch(":id")
  @UseGuards(CompanyRoleGuard)
  @RequireCompanyRole("OWNER", "ADMIN")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateCompanyBody)) body: UpdateCompanyBody,
  ): Promise<CompanyDto> {
    return this.companies.update(id, body);
  }

  @Delete(":id")
  @UseGuards(CompanyRoleGuard)
  @RequireCompanyRole("OWNER")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.companies.remove(id);
  }
}
