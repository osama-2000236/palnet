import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  AddSkillBody,
  EducationBody,
  ExperienceBody,
  OnboardProfileBody,
  UpdateProfileBody,
  type Profile as ProfileDto,
} from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { OptionalUser } from "../auth/decorators/optional-user.decorator";

import { ProfilesService } from "./profiles.service";

@ApiTags("profiles")
@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post("onboard")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Create or complete the current user's profile." })
  async onboard(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(OnboardProfileBody))
    body: OnboardProfileBody,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.onboard(user.id, body);
    return { data };
  }

  @Patch("me")
  @ApiBearerAuth()
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(UpdateProfileBody))
    body: UpdateProfileBody,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.updateMine(user.id, body);
    return { data };
  }

  @Get("me")
  @ApiBearerAuth()
  async me(@CurrentUser() user: AuthUser): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.getMine(user.id);
    return { data };
  }

  // ──────────────── Experiences ────────────────

  @Post("me/experiences")
  @ApiBearerAuth()
  async addExperience(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ExperienceBody))
    body: ExperienceBody,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.addExperience(user.id, body);
    return { data };
  }

  @Put("me/experiences/:id")
  @ApiBearerAuth()
  async updateExperience(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ExperienceBody))
    body: ExperienceBody,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.updateExperience(user.id, id, body);
    return { data };
  }

  @Delete("me/experiences/:id")
  @ApiBearerAuth()
  async deleteExperience(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.deleteExperience(user.id, id);
    return { data };
  }

  // ──────────────── Educations ────────────────

  @Post("me/educations")
  @ApiBearerAuth()
  async addEducation(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(EducationBody))
    body: EducationBody,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.addEducation(user.id, body);
    return { data };
  }

  @Put("me/educations/:id")
  @ApiBearerAuth()
  async updateEducation(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(EducationBody))
    body: EducationBody,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.updateEducation(user.id, id, body);
    return { data };
  }

  @Delete("me/educations/:id")
  @ApiBearerAuth()
  async deleteEducation(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.deleteEducation(user.id, id);
    return { data };
  }

  // ──────────────── Skills ────────────────

  @Post("me/skills")
  @ApiBearerAuth()
  async addSkill(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(AddSkillBody))
    body: AddSkillBody,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.addSkill(user.id, body);
    return { data };
  }

  @Delete("me/skills/:skillId")
  @ApiBearerAuth()
  async removeSkill(
    @CurrentUser() user: AuthUser,
    @Param("skillId") skillId: string,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.removeSkill(user.id, skillId);
    return { data };
  }

  // Public: anyone can view a profile, but we attach viewer state when a
  // token is supplied.
  @OptionalAuth()
  @Get(":handle")
  async byHandle(
    @Param("handle") handle: string,
    @OptionalUser() viewer: AuthUser | null,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.getByHandle(handle, viewer?.id);
    return { data };
  }
}
