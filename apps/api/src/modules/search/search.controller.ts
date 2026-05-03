import { type CursorPageMeta, PeopleSearchQuery, type SearchPersonHit } from "@baydar/shared";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";

import { SearchService } from "./search.service";

@ApiTags("search")
@ApiBearerAuth()
@RequireCompleteProfile()
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("people")
  async people(
    @Query(new ZodValidationPipe(PeopleSearchQuery))
    query: PeopleSearchQuery,
  ): Promise<{ data: SearchPersonHit[]; meta: CursorPageMeta }> {
    return this.search.people(query);
  }
}
