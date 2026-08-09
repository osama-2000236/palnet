import {
  AlumniQuery,
  DiasporaQuery,
  NearbyQuery,
  type DiscoveryPerson,
  type PeopleSuggestion,
} from "@baydar/shared";
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { DiscoveryService } from "./discovery.service";

@ApiTags("discovery")
@ApiBearerAuth()
@RequireCompleteProfile()
@Controller("discovery")
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  /**
   * Replaces `GET /connections/suggestions`, which returned people ordered by
   * profile freshness with no reason attached. The old path stays as an alias
   * for one release so a stale client build does not 404 — see
   * DEPRECATIONS.json.
   */
  @Get("people")
  async people(@CurrentUser() user: AuthUser): Promise<{ data: PeopleSuggestion[] }> {
    return { data: await this.discovery.peopleYouMayKnow(user.id) };
  }

  @Delete("people/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async dismiss(@CurrentUser() user: AuthUser, @Param("userId") userId: string): Promise<void> {
    await this.discovery.dismiss(user.id, userId);
  }

  @Get("alumni")
  async alumni(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(AlumniQuery)) query: AlumniQuery,
  ): Promise<{ data: DiscoveryPerson[] }> {
    return { data: await this.discovery.alumni(user.id, query) };
  }

  @Get("diaspora")
  async diaspora(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(DiasporaQuery)) query: DiasporaQuery,
  ): Promise<{ data: DiscoveryPerson[] }> {
    return { data: await this.discovery.diaspora(user.id, query) };
  }

  @Get("nearby")
  async nearby(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(NearbyQuery)) query: NearbyQuery,
  ): Promise<{ data: DiscoveryPerson[] }> {
    return { data: await this.discovery.nearby(user.id, query) };
  }
}
