import {
  CompaniesSearchQuery,
  type CursorPageMeta,
  JobsSearchQuery,
  PeopleSearchQuery,
  PostsSearchQuery,
  type SearchCompanyHit,
  type SearchJobHit,
  type SearchPersonHit,
  type SearchPostHit,
} from "@baydar/shared";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { SearchService } from "./search.service";

@ApiTags("search")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireCompleteProfile()
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("people")
  @RateLimit("search")
  async people(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(PeopleSearchQuery))
    query: PeopleSearchQuery,
  ): Promise<{ data: SearchPersonHit[]; meta: CursorPageMeta }> {
    return this.search.people(user.id, query);
  }

  @Get("posts")
  @RateLimit("search")
  async posts(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(PostsSearchQuery))
    query: PostsSearchQuery,
  ): Promise<{ data: SearchPostHit[]; meta: CursorPageMeta }> {
    return this.search.searchPosts(user.id, query);
  }

  @Get("companies")
  @RateLimit("search")
  async companies(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(CompaniesSearchQuery))
    query: CompaniesSearchQuery,
  ): Promise<{ data: SearchCompanyHit[]; meta: CursorPageMeta }> {
    return this.search.searchCompanies(user.id, query);
  }

  @Get("jobs")
  @RateLimit("search")
  async jobs(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(JobsSearchQuery))
    query: JobsSearchQuery,
  ): Promise<{ data: SearchJobHit[]; meta: CursorPageMeta }> {
    return this.search.searchJobs(user.id, query);
  }
}
