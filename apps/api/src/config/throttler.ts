import type { ThrottlerModuleOptions } from "@nestjs/throttler";

import type { Env } from "./env";
import { RedisThrottlerStorage } from "./redis-throttler-storage";

export const DEFAULT_THROTTLER = { ttl: 60_000, limit: 100 } as const;

export function createThrottlerOptions(env: Pick<Env, "REDIS_URL">): ThrottlerModuleOptions {
  if (!env.REDIS_URL) return [DEFAULT_THROTTLER];

  return {
    throttlers: [DEFAULT_THROTTLER],
    storage: new RedisThrottlerStorage(env.REDIS_URL),
  };
}
