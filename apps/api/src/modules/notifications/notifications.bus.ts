import type { Notification } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { LocalFanout, RedisFanout, type Fanout } from "../../common/fanout";
import { RedisClients } from "../redis/redis.clients";

// Fanout for notifications, keyed by recipient userId. Same pattern as
// MessagingBus: in-memory by default, Redis pub/sub when REDIS_URL is set.
export type NotificationEvent =
  | { type: "notification.new"; payload: Notification }
  | { type: "notification.read"; payload: { ids: string[]; at: string } }
  | { type: "notification.unread-count"; payload: { count: number } };

@Injectable()
export class NotificationsBus {
  private readonly fanout: Fanout<NotificationEvent>;

  constructor(redis: RedisClients) {
    this.fanout =
      redis.pub && redis.sub
        ? new RedisFanout<NotificationEvent>("notif", redis.pub, redis.sub)
        : new LocalFanout<NotificationEvent>();
  }

  publish(userId: string, event: NotificationEvent): void {
    this.fanout.publish(userId, event);
  }

  subscribe(userId: string, handler: (event: NotificationEvent) => void): () => void {
    return this.fanout.subscribe(userId, handler);
  }
}
