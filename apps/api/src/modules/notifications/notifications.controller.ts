import {
  CursorPageQuery,
  type CursorPageMeta,
  MarkNotificationsReadBody,
  type Notification,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Sse,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Observable } from "rxjs";

import { ZodValidationPipe } from "../../common/zod-pipe";
import {
  CurrentUser,
  type AuthUser,
} from "../auth/decorators/current-user.decorator";

import {
  NotificationsBus,
  type NotificationEvent,
} from "./notifications.bus";
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
    return this.notifications.list(
      user.id,
      parsed.after ?? null,
      parsed.limit,
    );
  }

  @Get("unread-count")
  async unreadCount(
    @CurrentUser() user: AuthUser,
  ): Promise<{ count: number }> {
    const count = await this.notifications.countUnread(user.id);
    return { count };
  }

  @Post("read")
  @UsePipes(new ZodValidationPipe(MarkNotificationsReadBody))
  async markRead(
    @CurrentUser() user: AuthUser,
    @Body() body: MarkNotificationsReadBody,
  ): Promise<{ count: number }> {
    return this.notifications.markRead(user.id, body);
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
