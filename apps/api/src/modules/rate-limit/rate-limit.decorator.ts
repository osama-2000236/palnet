import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";

import { RATE_LIMIT_KEY, type RateLimitClass } from "./rate-limit.constants";
import { RateLimitGuard } from "./rate-limit.guard";

export function RateLimit(limitClass: RateLimitClass): MethodDecorator & ClassDecorator {
  return applyDecorators(SetMetadata(RATE_LIMIT_KEY, limitClass), UseGuards(RateLimitGuard));
}
