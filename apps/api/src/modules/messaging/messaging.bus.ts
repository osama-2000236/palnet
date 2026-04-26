import { EventEmitter } from "node:events";

import type { WsChatEvent } from "@baydar/shared";
import { Injectable, Logger } from "@nestjs/common";

// In-memory fanout keyed by userId. Good enough for single-node deploys and for
// dev. For horizontal scaling, swap this with a Redis pub/sub adapter that
// emits the same WsChatEvent payloads per userId channel.
@Injectable()
export class MessagingBus {
  private readonly log = new Logger(MessagingBus.name);
  private readonly emitter = new EventEmitter();

  constructor() {
    // Many subscribers per user (multiple tabs). Lift the default cap.
    this.emitter.setMaxListeners(0);
  }

  publish(userId: string, event: WsChatEvent): void {
    this.emitter.emit(userId, event);
  }

  subscribe(userId: string, handler: (event: WsChatEvent) => void): () => void {
    this.emitter.on(userId, handler);
    return () => {
      this.emitter.off(userId, handler);
    };
  }
}
