import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CursorPageQuery, type CursorPageMeta, type Post as PostDto } from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { FeedService } from "./feed.service";

@ApiTags("feed")
@ApiBearerAuth()
@Controller("feed")
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  async get(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(CursorPageQuery))
    query: CursorPageQuery,
  ): Promise<{ data: PostDto[]; meta: CursorPageMeta }> {
    return this.feed.getFeed(user.id, query.after ?? null, query.limit);
  }
}
