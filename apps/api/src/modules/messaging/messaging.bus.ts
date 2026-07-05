import type { WsChatEvent } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { LocalFanout, RedisFanout, type Fanout } from "../../common/fanout";
import { RedisClients } from "../redis/redis.clients";

// Fanout keyed by userId. In-memory for single-node deploys and dev; Redis
// pub/sub when REDIS_URL is set so events reach users on other instances.
@Injectable()
export class MessagingBus {
  private readonly fanout: Fanout<WsChatEvent>;

  constructor(redis: RedisClients) {
    this.fanout =
      redis.pub && redis.sub
        ? new RedisFanout<WsChatEvent>("chat", redis.pub, redis.sub)
        : new LocalFanout<WsChatEvent>();
  }

  publish(userId: string, event: WsChatEvent): void {
    this.fanout.publish(userId, event);
  }

  subscribe(userId: string, handler: (event: WsChatEvent) => void): () => void {
    return this.fanout.subscribe(userId, handler);
  }
}
