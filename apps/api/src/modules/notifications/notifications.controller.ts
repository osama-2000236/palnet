import { Body, Controller, Get, Post, Query, Sse } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  CursorPageQuery,
  type CursorPageMeta,
  MarkNotificationsReadBody,
  type Notification,
  NotificationPreferences,
} from "@palnet/shared";
import { Observable } from "rxjs";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { NotificationsBus, type NotificationEvent } from "./notifications.bus";
import { NotificationsService } from "./notifications.service";

interface SseMessage {
  data: NotificationEvent;
  type: string;
}

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly bus: NotificationsBus,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, string | undefined>,
  ): Promise<{ data: Notification[]; meta: CursorPageMeta }> {
    const parsed = CursorPageQuery.parse({
      after: query.after,
      limit: query.limit,
    });
    return this.notifications.list(user.id, parsed.after ?? null, parsed.limit);
  }

  @Get("unread-count")
  async unreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    const count = await this.notifications.countUnread(user.id);
    return { count };
  }

  @Post("read")
  async markRead(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(MarkNotificationsReadBody))
    body: MarkNotificationsReadBody,
  ): Promise<{ count: number }> {
    return this.notifications.markRead(user.id, body);
  }

  @Get("preferences")
  async getPreferences(
    @CurrentUser() user: AuthUser,
  ): Promise<{ preferences: NotificationPreferences }> {
    const preferences = await this.notifications.getPreferences(user.id);
    return { preferences };
  }

  @Post("preferences")
  async updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(NotificationPreferences))
    body: NotificationPreferences,
  ): Promise<{ preferences: NotificationPreferences }> {
    const preferences = await this.notifications.updatePreferences(user.id, body);
    return { preferences };
  }

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
