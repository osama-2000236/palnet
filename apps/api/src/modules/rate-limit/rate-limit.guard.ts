import { createHash } from "node:crypto";

import { ErrorCode } from "@baydar/shared";
import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";

import { DomainException } from "../../common/domain-exception";
import type { AuthUser } from "../auth/decorators/current-user.decorator";

import { RATE_LIMIT_KEY, RATE_LIMITS, type RateLimitClass } from "./rate-limit.constants";
import { RateLimitStore, type RateLimitBackend } from "./rate-limit.store";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    // Token stays the class; the module factory may bind it to the Redis
    // implementation when REDIS_URL is set.
    @Inject(RateLimitStore) private readonly store: RateLimitBackend,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const limitClass = this.reflector.getAllAndOverride<RateLimitClass>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!limitClass) return true;

    const config = RATE_LIMITS[limitClass];
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request & { user?: AuthUser }>();
    const res = http.getResponse<Response>();
    const key = `${limitClass}:${trackerFor(req)}`;
    const result = await this.store.hit(key, config.limit, config.windowMs);
    const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

    res.setHeader("X-RateLimit-Limit", String(config.limit));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
    if (result.allowed) return true;

    res.setHeader("Retry-After", String(retryAfterSeconds));
    throw new DomainException(ErrorCode.RATE_LIMITED, "Rate limit exceeded.", 429, {
      class: limitClass,
      retryAfterSeconds,
    });
  }
}

function trackerFor(req: Request & { user?: AuthUser }): string {
  if (req.user?.id) return `user:${req.user.id}`;

  const authorization =
    typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  if (authorization) {
    return `auth:${createHash("sha256").update(authorization).digest("hex")}`;
  }

  return `ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`;
}
