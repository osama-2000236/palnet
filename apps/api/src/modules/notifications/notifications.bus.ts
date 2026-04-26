import { EventEmitter } from "node:events";

import type { Notification } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

// In-memory fanout for notifications, keyed by recipient userId. Same pattern
// as MessagingBus — swap for Redis pub/sub when we scale horizontally.
export type NotificationEvent =
  | { type: "notification.new"; payload: Notification }
  | { type: "notification.read"; payload: { ids: string[]; at: string } }
  | { type: "notification.unread-count"; payload: { count: number } };

@Injectable()
export class NotificationsBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  publish(userId: string, event: NotificationEvent): void {
    this.emitter.emit(userId, event);
  }

  subscribe(
    userId: string,
    handler: (event: NotificationEvent) => void,
  ): () => void {
    this.emitter.on(userId, handler);
    return () => {
      this.emitter.off(userId, handler);
    };
  }
}
