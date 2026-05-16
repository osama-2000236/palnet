import {
  AddCompanyMemberBody,
  type CompanyMember as CompanyMemberDto,
  UpdateCompanyMemberBody,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
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

import { CompaniesService } from "./companies.service";
import { CompanyRoleGuard, RequireCompanyRole } from "./guards/company-role.guard";

@ApiTags("companies")
@ApiBearerAuth()
@RequireCompleteProfile()
@UseGuards(CompanyRoleGuard)
@Controller("companies/:companyId/members")
export class CompanyMembersController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @RequireCompanyRole("OWNER", "ADMIN", "EDITOR")
  async list(@Param("companyId") companyId: string): Promise<CompanyMemberDto[]> {
    return this.companies.listMembers(companyId);
  }

  @Post()
  @RequireCompanyRole("OWNER", "ADMIN")
  async add(
    @Param("companyId") companyId: string,
    @Body(new ZodValidationPipe(AddCompanyMemberBody)) body: AddCompanyMemberBody,
  ): Promise<CompanyMemberDto> {
    return this.companies.addMember(companyId, body);
  }

  @Patch(":userId")
  @RequireCompanyRole("OWNER")
  async update(
    @CurrentUser() actor: AuthUser,
    @Param("companyId") companyId: string,
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(UpdateCompanyMemberBody)) body: UpdateCompanyMemberBody,
  ): Promise<CompanyMemberDto> {
    return this.companies.updateMember(companyId, userId, actor.id, body);
  }

  @Delete(":userId")
  @RequireCompanyRole("OWNER")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("companyId") companyId: string,
    @Param("userId") userId: string,
  ): Promise<void> {
    await this.companies.removeMember(companyId, userId);
  }
}
