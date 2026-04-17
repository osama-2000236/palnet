import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  type CursorPageMeta,
  PeopleSearchQuery,
  type SearchPersonHit,
} from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
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
  ): Promise<{ data: SearchPersonHit[]; meta: CursorPageMeta }> {
    return this.search.people(query);
  }
}
