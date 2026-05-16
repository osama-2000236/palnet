import {
  CreateRatingBody,
  RatingContext,
  type RatingSummary,
  type UserRating,
} from "@baydar/shared";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { RatingsService } from "./ratings.service";

const ListQuery = z.object({
  context: z.nativeEnum(RatingContext).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
type ListQuery = z.infer<typeof ListQuery>;

const SummaryQuery = z.object({ context: z.nativeEnum(RatingContext) });
type SummaryQuery = z.infer<typeof SummaryQuery>;

@ApiTags("ratings")
@ApiBearerAuth()
@RequireCompleteProfile()
@Controller("ratings")
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateRatingBody)) body: CreateRatingBody,
  ): Promise<UserRating> {
    return this.ratings.create(user.id, body);
  }

  @Get(":userId")
  async list(
    @Param("userId") userId: string,
    @Query(new ZodValidationPipe(ListQuery)) query: ListQuery,
  ): Promise<UserRating[]> {
    return this.ratings.listForUser(userId, query.context ?? null, query.limit);
  }

  @Get(":userId/summary")
  async summary(
    @Param("userId") userId: string,
    @Query(new ZodValidationPipe(SummaryQuery)) query: SummaryQuery,
  ): Promise<RatingSummary> {
    return this.ratings.summary(userId, query.context);
  }
}
