import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  type CursorPageMeta,
  PeopleSearchQuery,
  type SearchPersonHit,
} from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import {
  type AuthUser,
} from "../auth/decorators/current-user.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { OptionalUser } from "../auth/decorators/optional-user.decorator";

import { SearchService } from "./search.service";

@ApiTags("search")
@ApiBearerAuth()
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @OptionalAuth()
  @Get("people")
  async people(
    @Query(new ZodValidationPipe(PeopleSearchQuery))
    query: PeopleSearchQuery,
    @OptionalUser() viewer: AuthUser | null,
  ): Promise<{ data: SearchPersonHit[]; meta: CursorPageMeta }> {
    return this.search.people(query, viewer?.id ?? null);
  }
}
