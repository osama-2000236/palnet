import {
  RequestRecommendationBody,
  RespondToRecommendationBody,
  SetRecommendationVisibilityBody,
  WriteRecommendationBody,
  type Recommendation,
} from "@baydar/shared";
import { Body, Controller, Get, Header, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { RecommendationsService } from "./recommendations.service";

@ApiTags("recommendations")
@ApiBearerAuth()
@Controller("recommendations")
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Post("requests")
  @RateLimit("contentCreate")
  async request(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RequestRecommendationBody)) body: RequestRecommendationBody,
  ): Promise<{ data: Recommendation }> {
    return { data: await this.recommendations.request(user.id, body) };
  }

  @Get("requests")
  @Header("Cache-Control", "private, no-store")
  async myRequests(@CurrentUser() user: AuthUser): Promise<{ data: Recommendation[] }> {
    return { data: await this.recommendations.listRequestsForMe(user.id) };
  }

  @Post()
  @RateLimit("contentCreate")
  async write(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(WriteRecommendationBody)) body: WriteRecommendationBody,
  ): Promise<{ data: Recommendation }> {
    return { data: await this.recommendations.write(user.id, body) };
  }

  @Post(":id/respond")
  async respond(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(RespondToRecommendationBody)) body: RespondToRecommendationBody,
  ): Promise<{ data: Recommendation }> {
    return { data: await this.recommendations.respond(user.id, id, body) };
  }

  @Post(":id/withdraw")
  async withdraw(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: Recommendation }> {
    return { data: await this.recommendations.withdraw(user.id, id) };
  }

  /** The subject may hide, never edit. There is no route that changes the body. */
  @Patch(":id/visibility")
  async setVisibility(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SetRecommendationVisibilityBody))
    body: SetRecommendationVisibilityBody,
  ): Promise<{ data: Recommendation }> {
    return { data: await this.recommendations.setVisibility(user.id, id, body) };
  }

  /**
   * Somebody's testimonials.
   *
   * Private cache because the subject sees more of their own list than a
   * stranger does — one shared response would leak pending and hidden rows.
   */
  @Get(":handle")
  @Header("Cache-Control", "private, no-store")
  async listFor(
    @CurrentUser() user: AuthUser,
    @Param("handle") handle: string,
  ): Promise<{ data: Recommendation[] }> {
    return { data: await this.recommendations.listFor(handle, user.id) };
  }
}
