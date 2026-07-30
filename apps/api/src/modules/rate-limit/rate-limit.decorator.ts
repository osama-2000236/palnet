import { applyDecorators, SetMetadata } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { RATE_LIMIT_KEY, RATE_LIMITS, type RateLimitClass } from "./rate-limit.constants";

/**
 * Tag a route with a rate-limit bucket. `@Throttle` re-configures the global
 * throttler for this handler; the metadata tells BaydarThrottlerGuard which
 * shared budget the handler spends from.
 */
export function RateLimit(limitClass: RateLimitClass): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, limitClass),
    Throttle({ default: RATE_LIMITS[limitClass] }),
  );
}
