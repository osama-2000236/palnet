import {
  RespondConnectionBody,
  SendConnectionBody,
  type ConnectionListItem,
  type PersonSuggestion,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { ConnectionsService } from "./connections.service";

const ListQuery = z.object({
  filter: z.enum(["ACCEPTED", "INCOMING", "OUTGOING"]).default("ACCEPTED"),
});
type ListQuery = z.infer<typeof ListQuery>;

const SuggestionsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(6),
});
type SuggestionsQuery = z.infer<typeof SuggestionsQuery>;

@ApiTags("connections")
@ApiBearerAuth()
@RequireCompleteProfile()
@Controller("connections")
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async send(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(SendConnectionBody)) body: SendConnectionBody,
  ) {
    const data = await this.connections.send(user.id, body);
    return { data };
  }

  @Post(":id/respond")
  async respond(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(RespondConnectionBody))
    body: RespondConnectionBody,
  ) {
    const data = await this.connections.respond(user.id, id, body);
    return { data };
  }

  @Post(":id/withdraw")
  async withdraw(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const data = await this.connections.withdraw(user.id, id);
    return { data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.connections.remove(user.id, id);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(ListQuery)) query: ListQuery,
  ): Promise<{ data: ConnectionListItem[] }> {
    const data = await this.connections.listMine(user.id, query.filter);
    return { data };
  }

  @Get("counts")
  async counts(@CurrentUser() user: AuthUser) {
    const data = await this.connections.counts(user.id);
    return { data };
  }

  @Get("suggestions")
  async suggestions(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(SuggestionsQuery)) query: SuggestionsQuery,
  ): Promise<{ data: PersonSuggestion[] }> {
    const data = await this.connections.suggestions(user.id, query.limit);
    return { data };
  }
}
