import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { AuthUser } from "./current-user.decorator";

// Returns the AuthUser when a valid token was supplied, or null when the
// request was anonymous. Pair with @OptionalAuth() on the route.
export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    return req.user ?? null;
  },
);
