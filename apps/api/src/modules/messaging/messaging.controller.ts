import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Sse,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  type ChatRoom,
  CreateOrGetDmBody,
  CursorPageQuery,
  type Message,
  SendMessageBody,
  type WsChatEvent,
} from "@baydar/shared";
import { Observable } from "rxjs";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { MessagingBus } from "./messaging.bus";
import { MessagingService } from "./messaging.service";

interface SseMessage {
  data: WsChatEvent;
  type: string;
}

@ApiTags("messaging")
@ApiBearerAuth()
@Controller("messaging")
export class MessagingController {
  constructor(
    private readonly messaging: MessagingService,
    private readonly bus: MessagingBus,
  ) {}

  @Get("rooms")
  async listRooms(
    @CurrentUser() user: AuthUser,
    @Query("archived") archived?: string,
  ): Promise<{ data: ChatRoom[] }> {
    const data = await this.messaging.listMyRooms(user.id, {
      archived: archived === "1" || archived === "true",
    });
    return { data };
  }

  @Post("rooms")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async findOrCreateDm(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateOrGetDmBody))
    body: CreateOrGetDmBody,
  ): Promise<ChatRoom> {
    return this.messaging.findOrCreateDm(user.id, body.otherUserId);
  }

  @Get("rooms/:id")
  async getRoom(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<ChatRoom> {
    return this.messaging.getRoomDto(id, user.id);
  }

  @Get("rooms/:id/messages")
  async listMessages(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query() query: Record<string, string | undefined>,
  ): Promise<{
    data: Message[];
    meta: { nextCursor: string | null; hasMore: boolean; limit: number };
  }> {
    const parsed = CursorPageQuery.parse({
      after: query.after,
      limit: query.limit,
    });
    const page = await this.messaging.listMessages(user.id, id, parsed.after ?? null, parsed.limit);
    return {
      data: page.data,
      meta: {
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        limit: page.limit,
      },
    };
  }

  @Post("rooms/:id/messages")
  // Send burst — 60/min per user across all rooms. Keeps a fast chatter
  // happy, cuts a broadcast bot off before it hits the global 100/60s.
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SendMessageBody))
    body: SendMessageBody,
  ): Promise<Message> {
    return this.messaging.sendMessage(user.id, id, body);
  }

  @Post("rooms/:id/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.messaging.markRead(user.id, id);
  }

  @Post("rooms/:id/archive")
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.messaging.archiveRoom(user.id, id);
  }

  @Post("rooms/:id/unarchive")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unarchive(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.messaging.unarchiveRoom(user.id, id);
  }

  @Post("rooms/:id/typing")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async typing(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.messaging.publishTyping(user.id, id);
  }

  // Server-Sent Events channel for this user. Clients subscribe once and
  // receive every chat event fanned out by the bus.
  @Sse("stream")
  stream(@CurrentUser() user: AuthUser): Observable<SseMessage> {
    return new Observable<SseMessage>((subscriber) => {
      const unsubscribe = this.bus.subscribe(user.id, (event) => {
        subscriber.next({ data: event, type: event.type });
      });
      return (): void => {
        unsubscribe();
      };
    });
  }
}
