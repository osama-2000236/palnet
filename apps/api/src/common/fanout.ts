import { EventEmitter } from "node:events";

import { Logger } from "@nestjs/common";
import type { Redis } from "ioredis";

/**
 * Per-user event fanout used by the SSE buses (messaging, notifications).
 * LocalFanout is process-local; RedisFanout bridges instances via pub/sub so
 * a user connected to instance A still receives events published on B.
 */
export interface Fanout<TEvent> {
  publish(userId: string, event: TEvent): void;
  subscribe(userId: string, handler: (event: TEvent) => void): () => void;
}

export class LocalFanout<TEvent> implements Fanout<TEvent> {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Many subscribers per user (multiple tabs/devices). Lift the default cap.
    this.emitter.setMaxListeners(0);
  }

  publish(userId: string, event: TEvent): void {
    this.emitter.emit(userId, event);
  }

  subscribe(userId: string, handler: (event: TEvent) => void): () => void {
    this.emitter.on(userId, handler);
    return () => {
      this.emitter.off(userId, handler);
    };
  }
}

export class RedisFanout<TEvent> implements Fanout<TEvent> {
  private readonly log: Logger;
  private readonly emitter = new EventEmitter();
  // Refcount per channel so we unsubscribe from Redis when the last local
  // listener for that user disconnects.
  private readonly refs = new Map<string, number>();

  constructor(
    private readonly prefix: string,
    private readonly pub: Redis,
    private readonly sub: Redis,
  ) {
    this.log = new Logger(`RedisFanout:${prefix}`);
    this.emitter.setMaxListeners(0);
    this.sub.on("message", (channel: string, raw: string) => {
      if (!channel.startsWith(`${this.prefix}:`)) return;
      try {
        this.emitter.emit(channel, JSON.parse(raw) as TEvent);
      } catch {
        this.log.warn(`dropped malformed payload on ${channel}`);
      }
    });
  }

  publish(userId: string, event: TEvent): void {
    // Fire-and-forget: SSE events are best-effort; clients re-sync on reconnect.
    void this.pub
      .publish(this.channel(userId), JSON.stringify(event))
      .catch((err: Error) => this.log.warn(`publish failed: ${err.message}`));
  }

  subscribe(userId: string, handler: (event: TEvent) => void): () => void {
    const channel = this.channel(userId);
    const count = this.refs.get(channel) ?? 0;
    this.refs.set(channel, count + 1);
    if (count === 0) {
      void this.sub
        .subscribe(channel)
        .catch((err: Error) => this.log.warn(`subscribe failed: ${err.message}`));
    }
    this.emitter.on(channel, handler);
    return () => {
      this.emitter.off(channel, handler);
      const remaining = (this.refs.get(channel) ?? 1) - 1;
      if (remaining <= 0) {
        this.refs.delete(channel);
        void this.sub.unsubscribe(channel).catch(() => undefined);
      } else {
        this.refs.set(channel, remaining);
      }
    };
  }

  private channel(userId: string): string {
    return `${this.prefix}:${userId}`;
  }
}
