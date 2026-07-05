import { Global, Module } from "@nestjs/common";

import { RedisClients } from "../redis/redis.clients";
import { RedisModule } from "../redis/redis.module";

import { RateLimitGuard } from "./rate-limit.guard";
import { RateLimitStore, RedisRateLimitStore } from "./rate-limit.store";

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    RateLimitGuard,
    {
      provide: RateLimitStore,
      useFactory: (redis: RedisClients) =>
        redis.pub ? new RedisRateLimitStore(redis.pub) : new RateLimitStore(),
      inject: [RedisClients],
    },
  ],
  exports: [RateLimitGuard, RateLimitStore],
})
export class RateLimitModule {}
