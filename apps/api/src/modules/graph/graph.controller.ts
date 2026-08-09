import {
  DegreeBadge,
  FollowPerson,
  MutualConnections,
  type FollowPerson as FollowPersonDto,
  type MutualConnections as MutualConnectionsDto,
} from "@baydar/shared";
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { GraphService } from "./graph.service";

/** Unused at runtime; keeps the response schemas beside the routes. */
void [DegreeBadge, FollowPerson, MutualConnections];

const TargetBody = z.object({ userId: z.string().cuid() });
type TargetBody = z.infer<typeof TargetBody>;

@ApiBearerAuth()
@Controller()
export class GraphController {
  constructor(private readonly graph: GraphService) {}

  // ── Feed mutes ───────────────────────────────────────────────────────────

  @ApiTags("feed-mutes")
  @Post("feed-mutes")
  @HttpCode(HttpStatus.NO_CONTENT)
  async mute(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(TargetBody)) body: TargetBody,
  ): Promise<void> {
    await this.graph.mute(user.id, body.userId);
  }

  @ApiTags("feed-mutes")
  @Delete("feed-mutes/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unmute(@CurrentUser() user: AuthUser, @Param("userId") userId: string): Promise<void> {
    await this.graph.unmute(user.id, userId);
  }

  @ApiTags("feed-mutes")
  @Get("feed-mutes")
  async listMutes(@CurrentUser() user: AuthUser): Promise<{ data: FollowPersonDto[] }> {
    return { data: await this.graph.listMutes(user.id) };
  }

  // ── Restrictions ─────────────────────────────────────────────────────────

  @ApiTags("restrictions")
  @Post("restrictions")
  @HttpCode(HttpStatus.NO_CONTENT)
  async restrict(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(TargetBody)) body: TargetBody,
  ): Promise<void> {
    await this.graph.restrict(user.id, body.userId);
  }

  @ApiTags("restrictions")
  @Delete("restrictions/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unrestrict(@CurrentUser() user: AuthUser, @Param("userId") userId: string): Promise<void> {
    await this.graph.unrestrict(user.id, userId);
  }

  @ApiTags("restrictions")
  @Get("restrictions")
  async listRestrictions(@CurrentUser() user: AuthUser): Promise<{ data: FollowPersonDto[] }> {
    return { data: await this.graph.listRestrictions(user.id) };
  }

  // ── Degree ───────────────────────────────────────────────────────────────

  @ApiTags("connections")
  @Get("connections/degree/:userId")
  async degree(
    @CurrentUser() user: AuthUser,
    @Param("userId") userId: string,
  ): Promise<{ data: { degree: string; mutuals: MutualConnectionsDto } }> {
    const [degree, mutuals] = await Promise.all([
      this.graph.degreeOf(user.id, userId),
      this.graph.mutualsWith(user.id, userId),
    ]);
    return { data: { degree: degree.degree, mutuals } };
  }
}
