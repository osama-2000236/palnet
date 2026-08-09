import {
  ClaimOccupationBody,
  CreateLicenceBody,
  CreateVouchBody,
  type EvidenceSummary,
  ErrorCode,
  type Licence,
  type Vouch,
} from "@baydar/shared";
import { Body, Controller, Delete, Get, Header, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { DomainException } from "../../common/domain-exception";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { CredentialsService } from "./credentials.service";
import { StandingService } from "./standing.service";

@ApiTags("evidence")
@ApiBearerAuth()
@Controller()
export class CredentialsController {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly standing: StandingService,
    private readonly prisma: PrismaService,
  ) {}

  // ──────────────── Occupation claims ────────────────

  @Post("profiles/me/claims")
  async claim(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ClaimOccupationBody)) body: ClaimOccupationBody,
  ): Promise<{ data: { ok: true } }> {
    await this.credentials.claim(user.id, body);
    return { data: { ok: true } };
  }

  @Delete("profiles/me/claims/:occupationKey")
  async unclaim(
    @CurrentUser() user: AuthUser,
    @Param("occupationKey") occupationKey: string,
  ): Promise<{ data: { ok: true } }> {
    await this.credentials.unclaim(user.id, occupationKey);
    return { data: { ok: true } };
  }

  // ──────────────── Evidence summary ────────────────

  /**
   * What is behind this person, and the score derived from it.
   *
   * Private cache: the rating average is withheld below the floor and the
   * numbers are read by an employer about a specific candidate. Nothing here
   * belongs in a shared cache.
   */
  @Get("profiles/:handle/evidence")
  @Header("Cache-Control", "private, no-store")
  async evidence(@Param("handle") handle: string): Promise<{ data: EvidenceSummary }> {
    const profile = await this.prisma.profile.findUnique({
      where: { handle },
      select: { userId: true },
    });
    if (!profile) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    return { data: await this.standing.summaryFor(profile.userId) };
  }

  // ──────────────── Vouches ────────────────

  @Post("vouches")
  @RateLimit("contentCreate")
  async vouch(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateVouchBody)) body: CreateVouchBody,
  ): Promise<{ data: Vouch }> {
    return { data: await this.credentials.vouch(user.id, body) };
  }

  @Delete("vouches/:id")
  async revokeVouch(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: { ok: true } }> {
    await this.credentials.revokeVouch(user.id, id);
    return { data: { ok: true } };
  }

  // ──────────────── Licences ────────────────

  @Post("licences")
  @RateLimit("contentCreate")
  async addLicence(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateLicenceBody)) body: CreateLicenceBody,
  ): Promise<{ data: Licence }> {
    return { data: await this.credentials.addLicence(user.id, body) };
  }

  @Post("licences/:id/verify-request")
  async requestLicenceVerification(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: Licence }> {
    return { data: await this.credentials.requestLicenceVerification(user.id, id) };
  }

  @Delete("licences/:id")
  async removeLicence(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: { ok: true } }> {
    await this.credentials.removeLicence(user.id, id);
    return { data: { ok: true } };
  }
}
