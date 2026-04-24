import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  type Company,
  type CompanyDetail,
  type CompanyMember,
  type ManagedCompany,
  AddCompanyMemberBody,
  CreateCompanyBody,
  UpdateCompanyBody,
} from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { CompaniesService } from "./companies.service";

@ApiTags("companies")
@ApiBearerAuth()
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get("mine")
  async listManaged(@CurrentUser() user: AuthUser): Promise<{ data: ManagedCompany[] }> {
    return { data: await this.companies.listManaged(user) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateCompanyBody))
    body: CreateCompanyBody,
  ): Promise<Company> {
    return this.companies.create(user, body);
  }

  @Get(":slug")
  async getBySlug(
    @CurrentUser() user: AuthUser,
    @Param("slug") slug: string,
  ): Promise<CompanyDetail> {
    return this.companies.getBySlug(user, slug);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateCompanyBody))
    body: UpdateCompanyBody,
  ): Promise<Company> {
    return this.companies.update(user, id, body);
  }

  @Post(":id/members")
  async addMember(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AddCompanyMemberBody))
    body: AddCompanyMemberBody,
  ): Promise<CompanyMember> {
    return this.companies.addMember(user, id, body);
  }

  @Delete(":id/members/:userId")
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("userId") userId: string,
  ): Promise<{ success: true }> {
    await this.companies.removeMember(user, id, userId);
    return { success: true };
  }
}
