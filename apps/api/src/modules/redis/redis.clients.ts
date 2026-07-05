import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

/**
 * Shared Redis connections, created only when REDIS_URL is set. Pub/sub needs
 * two connections because a subscribing ioredis client cannot issue regular
 * commands. `pub` doubles as the general-purpose client (rate limiting).
 * Both are null in single-instance / dev / test deployments.
 */
@Injectable()
export class RedisClients implements OnModuleDestroy {
  readonly pub: Redis | null;
  readonly sub: Redis | null;
  private readonly log = new Logger(RedisClients.name);

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.pub = null;
      this.sub = null;
      return;
    }
    // lazyConnect keeps boot fast and lets a temporarily-down Redis come up
    // later; commands queue until the connection is established.
    this.pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
    this.sub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
    for (const [name, client] of [
      ["pub", this.pub],
      ["sub", this.sub],
    ] as const) {
      client.on("error", (err) => this.log.warn(`redis ${name} error: ${err.message}`));
    }
  }

  get enabled(): boolean {
    return this.pub !== null;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.pub?.quit(), this.sub?.quit()]);
  }
}
