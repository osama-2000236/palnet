import {
  type ChatRoom,
  CreateRoomBody,
  CursorPageQuery,
  type Message,
  SendMessageBody,
  UpdateMessageBody,
  type WsChatEvent,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Sse,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Observable } from "rxjs";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
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
@RequireCompleteProfile()
@Controller("messaging")
export class MessagingController {
  constructor(
    private readonly messaging: MessagingService,
    private readonly bus: MessagingBus,
  ) {}

  @Get("rooms")
  async listRooms(@CurrentUser() user: AuthUser): Promise<{ data: ChatRoom[] }> {
    const data = await this.messaging.listMyRooms(user.id);
    return { data };
  }

  @Post("rooms")
  async createRoom(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateRoomBody)) body: CreateRoomBody,
  ): Promise<ChatRoom> {
    if ("otherUserId" in body) {
      return this.messaging.findOrCreateDm(user.id, body.otherUserId);
    }
    return this.messaging.createGroupRoom(user.id, body);
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
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SendMessageBody)) body: SendMessageBody,
  ): Promise<Message> {
    return this.messaging.sendMessage(user.id, id, body);
  }

  @Patch("messages/:id")
  async editMessage(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateMessageBody)) body: UpdateMessageBody,
  ): Promise<Message> {
    return this.messaging.editMessage(user.id, id, body);
  }

  @Delete("messages/:id")
  async deleteMessage(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<Message> {
    return this.messaging.deleteMessage(user.id, id);
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

  @Post("rooms/:id/typing")
  @HttpCode(HttpStatus.NO_CONTENT)
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
