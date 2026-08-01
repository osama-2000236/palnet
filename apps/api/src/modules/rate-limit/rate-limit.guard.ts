import { ErrorCode } from "@baydar/shared";
import { Injectable, type ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from "@nestjs/throttler";
import type { Request } from "express";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { bearerToken, verifyAccessToken } from "../auth/session-tokens";

import { RATE_LIMIT_KEY, type RateLimitClass } from "./rate-limit.constants";

/**
 * The one rate limiter. @nestjs/throttler owns the counting, the
 * `X-RateLimit-*` headers and the storage (RedisThrottlerStorage when
 * REDIS_URL is set); this subclass adds the three things Baydar needs on top:
 *
 *   • Identity-first tracking. Throttler keys on `req.ip`, so one office NAT
 *     or one carrier gateway would throttle every user behind it as a single
 *     caller — the common case on Palestinian carrier networks. A request
 *     carrying a *verified* access token keys on the user id instead, so a
 *     quota also survives the token rotating on refresh.
 *   • Shared buckets. `@RateLimit("search")` spends ONE budget across all four
 *     search handlers. Throttler's default key includes the handler name,
 *     which would hand the same caller four separate 60/min budgets.
 *   • The app's error envelope. A 429 leaves as DomainException/RATE_LIMITED
 *     like every other domain failure, so clients read one error shape.
 */
@Injectable()
export class BaydarThrottlerGuard extends ThrottlerGuard {
  // `ThrottlerModuleOptions` and `ThrottlerStorage` are interfaces, so
  // `design:paramtypes` emits `Object` for them and Nest cannot resolve them
  // by type. The base class tags them with these two decorators; a subclass
  // declaring its own constructor has to repeat them.
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly config: ConfigService<Env, true>,
  ) {
    super(options, storageService, reflector);
  }

  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request & { user?: AuthUser };
    if (request.user?.id) return `user:${request.user.id}`;

    // This guard is a global APP_GUARD and so runs *before* the global
    // JwtAuthGuard: `req.user` is not populated yet on any route, and never at
    // all on `@Public()` ones. So the subject is re-derived here from a
    // *verified* token. Verified is the whole point — keying on the raw
    // Authorization header (hashed or not) let any caller mint a fresh bucket
    // per request by varying a header nobody had checked, which handed
    // /auth/login an unlimited brute-force budget.
    const token = bearerToken(request.headers.authorization);
    const subject = token ? verifyAccessToken(this.config, token)?.sub : undefined;
    if (subject) return `user:${subject}`;

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
