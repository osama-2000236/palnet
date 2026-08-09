import {
  CareerBreakBody,
  CertificateBody,
  HonorBody,
  ProfileLanguageBody,
  ProfileTranslationBody,
  PublicationBody,
  VolunteerRoleBody,
  type Certificate,
  type Honor,
  type ProfileLanguage,
  type ProfileTranslation,
  type Publication,
  type VolunteerRole,
} from "@baydar/shared";
import { Body, Controller, Delete, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { ProfileSectionsService } from "./profile-sections.service";

/**
 * The sections that are not jobs and schools.
 *
 * Their own controller rather than more methods on ProfilesController: these
 * are twenty routes over six tables, and bolting them onto the file that owns
 * onboarding would put the handle-collision logic and a publication's venue in
 * the same 500-line read.
 *
 * Every route is `me`-scoped. There is no route here that takes somebody else's
 * profile id, which is the cheapest possible answer to "can I edit your CV".
 */
@ApiTags("profiles")
@ApiBearerAuth()
@Controller("profiles/me")
export class ProfileSectionsController {
  constructor(private readonly sections: ProfileSectionsService) {}

  // ──────────────── Certificates ────────────────

  @Post("certificates")
  @RateLimit("contentCreate")
  async addCertificate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CertificateBody)) body: CertificateBody,
  ): Promise<{ data: Certificate }> {
    return { data: await this.sections.addCertificate(user.id, body) };
  }

  @Put("certificates/:id")
  async updateCertificate(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(CertificateBody)) body: CertificateBody,
  ): Promise<{ data: Certificate }> {
    return { data: await this.sections.updateCertificate(user.id, id, body) };
  }

  @Delete("certificates/:id")
  async removeCertificate(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: { ok: true } }> {
    await this.sections.removeCertificate(user.id, id);
    return { data: { ok: true } };
  }

  // ──────────────── Languages ────────────────

  @Post("languages")
  async setLanguage(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ProfileLanguageBody)) body: ProfileLanguageBody,
  ): Promise<{ data: ProfileLanguage }> {
    return { data: await this.sections.setLanguage(user.id, body) };
  }

  @Delete("languages/:languageKey")
  async removeLanguage(
    @CurrentUser() user: AuthUser,
    @Param("languageKey") languageKey: string,
  ): Promise<{ data: { ok: true } }> {
    await this.sections.removeLanguage(user.id, languageKey);
    return { data: { ok: true } };
  }

  // ──────────────── Volunteering ────────────────

  @Post("volunteer")
  @RateLimit("contentCreate")
  async addVolunteerRole(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(VolunteerRoleBody)) body: VolunteerRoleBody,
  ): Promise<{ data: VolunteerRole }> {
    return { data: await this.sections.addVolunteerRole(user.id, body) };
  }

  @Put("volunteer/:id")
  async updateVolunteerRole(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(VolunteerRoleBody)) body: VolunteerRoleBody,
  ): Promise<{ data: VolunteerRole }> {
    return { data: await this.sections.updateVolunteerRole(user.id, id, body) };
  }

  @Delete("volunteer/:id")
  async removeVolunteerRole(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: { ok: true } }> {
    await this.sections.removeVolunteerRole(user.id, id);
    return { data: { ok: true } };
  }

  // ──────────────── Honors ────────────────

  @Post("honors")
  @RateLimit("contentCreate")
  async addHonor(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(HonorBody)) body: HonorBody,
  ): Promise<{ data: Honor }> {
    return { data: await this.sections.addHonor(user.id, body) };
  }

  @Put("honors/:id")
  async updateHonor(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(HonorBody)) body: HonorBody,
  ): Promise<{ data: Honor }> {
    return { data: await this.sections.updateHonor(user.id, id, body) };
  }

  @Delete("honors/:id")
  async removeHonor(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: { ok: true } }> {
    await this.sections.removeHonor(user.id, id);
    return { data: { ok: true } };
  }

  // ──────────────── Publications ────────────────

  @Post("publications")
  @RateLimit("contentCreate")
  async addPublication(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(PublicationBody)) body: PublicationBody,
  ): Promise<{ data: Publication }> {
    return { data: await this.sections.addPublication(user.id, body) };
  }

  @Put("publications/:id")
  async updatePublication(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(PublicationBody)) body: PublicationBody,
  ): Promise<{ data: Publication }> {
    return { data: await this.sections.updatePublication(user.id, id, body) };
  }

  @Delete("publications/:id")
  async removePublication(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: { ok: true } }> {
    await this.sections.removePublication(user.id, id);
    return { data: { ok: true } };
  }

  // ──────────────── Translation, career break ────────────────

  @Put("translations/:locale")
  async setTranslation(
    @CurrentUser() user: AuthUser,
    @Param("locale") locale: string,
    @Body(new ZodValidationPipe(ProfileTranslationBody)) body: ProfileTranslationBody,
  ): Promise<{ data: ProfileTranslation }> {
    return { data: await this.sections.setTranslation(user.id, locale, body) };
  }

  @Delete("translations/:locale")
  async removeTranslation(
    @CurrentUser() user: AuthUser,
    @Param("locale") locale: string,
  ): Promise<{ data: { ok: true } }> {
    await this.sections.removeTranslation(user.id, locale);
    return { data: { ok: true } };
  }

  @Put("career-break")
  async setCareerBreak(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CareerBreakBody)) body: CareerBreakBody,
  ): Promise<{ data: { ok: true } }> {
    await this.sections.setCareerBreak(user.id, body);
    return { data: { ok: true } };
  }

  @Delete("career-break")
  async clearCareerBreak(@CurrentUser() user: AuthUser): Promise<{ data: { ok: true } }> {
    await this.sections.setCareerBreak(user.id, null);
    return { data: { ok: true } };
  }
}
