import {
  CursorPageQuery,
  FollowBody,
  FollowListQuery,
  cursorPage,
  FollowRow as FollowRowSchema,
  type CursorPageMeta,
  type FollowRow,
  type FollowState,
  type FollowerCounts,
} from "@baydar/shared";
import { Body, Controller, Delete, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { FollowsService } from "./follows.service";

/** Unused at runtime; keeps the envelope shape next to the routes it describes. */
void cursorPage(FollowRowSchema);

@ApiTags("follows")
@ApiBearerAuth()
@Controller("follows")
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Post()
  @RateLimit("contentCreate")
  async follow(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(FollowBody)) body: FollowBody,
  ): Promise<{ data: FollowState }> {
    return { data: await this.follows.follow(user.id, body) };
  }

  /**
   * Unfollow. A body rather than a path parameter, because the target is one
   * of three shapes and encoding that into a URL means parsing it back out.
   */
  @Delete()
  async unfollow(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(FollowBody)) body: FollowBody,
  ): Promise<{ data: FollowState }> {
    return { data: await this.follows.unfollow(user.id, body) };
  }

  @Get("me")
  async listMine(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(CursorPageQuery)) page: CursorPageQuery,
    @Query(new ZodValidationPipe(FollowListQuery)) filter: FollowListQuery,
  ): Promise<{ data: FollowRow[]; meta: CursorPageMeta }> {
    return this.follows.listFollowing(
      user.id,
      filter.targetType ?? null,
      page.after ?? null,
      page.limit,
    );
  }

  @Get("followers")
  async listFollowers(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(CursorPageQuery)) page: CursorPageQuery,
  ): Promise<{ data: FollowRow[]; meta: CursorPageMeta }> {
    return this.follows.listFollowers(user.id, page.after ?? null, page.limit);
  }

  @Get("counts")
  async counts(@CurrentUser() user: AuthUser): Promise<{ data: FollowerCounts }> {
    return { data: await this.follows.countsFor(user.id) };
  }
}
