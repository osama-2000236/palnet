import { createHash } from "node:crypto";

import { ErrorCode } from "@baydar/shared";
import { Injectable, type ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard, type ThrottlerLimitDetail } from "@nestjs/throttler";
import type { Request } from "express";

import { DomainException } from "../../common/domain-exception";
import type { AuthUser } from "../auth/decorators/current-user.decorator";

import { RATE_LIMIT_KEY, type RateLimitClass } from "./rate-limit.constants";

/**
 * The one rate limiter. @nestjs/throttler owns the counting, the
 * `X-RateLimit-*` headers and the storage (RedisThrottlerStorage when
 * REDIS_URL is set); this subclass adds the three things Baydar needs on top:
 *
 *   • Identity-first tracking. Throttler keys on `req.ip`, so one office NAT
 *     or one carrier gateway would throttle every user behind it as a single
 *     caller. An authenticated request keys on the user id instead.
 *   • Shared buckets. `@RateLimit("search")` spends ONE budget across all four
 *     search handlers. Throttler's default key includes the handler name,
 *     which would hand the same caller four separate 60/min budgets.
 *   • The app's error envelope. A 429 leaves as DomainException/RATE_LIMITED
 *     like every other domain failure, so clients read one error shape.
 */
@Injectable()
export class BaydarThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request & { user?: AuthUser };
    if (request.user?.id) return `user:${request.user.id}`;

    // Pre-`JwtAuthGuard` routes (refresh, logout) carry the identity in the
    // header but never populate `req.user`. Hash it — the raw token must not
    // become a storage key.
    const authorization =
      typeof request.headers.authorization === "string" ? request.headers.authorization : "";
    if (authorization) {
      return `auth:${createHash("sha256").update(authorization).digest("hex")}`;
    }

    return `ip:${request.ip ?? request.socket?.remoteAddress ?? "unknown"}`;
  }

  protected override generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const bucket = this.bucketFor(context);
    return bucket ? `${bucket}:${suffix}` : super.generateKey(context, suffix, name);
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new DomainException(ErrorCode.RATE_LIMITED, "Rate limit exceeded.", 429, {
      class: this.bucketFor(context),
      retryAfterSeconds: Math.max(1, detail.timeToBlockExpire),
    });
  }

  private bucketFor(context: ExecutionContext): RateLimitClass | undefined {
    return this.reflector.getAllAndOverride<RateLimitClass | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
