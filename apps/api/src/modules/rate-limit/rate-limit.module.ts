import { Global, Module } from "@nestjs/common";

import { RateLimitGuard } from "./rate-limit.guard";
import { RateLimitStore } from "./rate-limit.store";

@Global()
@Module({
  providers: [RateLimitGuard, RateLimitStore],
  exports: [RateLimitGuard, RateLimitStore],
})
export class RateLimitModule {}
