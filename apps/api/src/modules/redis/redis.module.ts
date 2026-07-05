import { Global, Module } from "@nestjs/common";

import { RedisClients } from "./redis.clients";

@Global()
@Module({
  providers: [RedisClients],
  exports: [RedisClients],
})
export class RedisModule {}
