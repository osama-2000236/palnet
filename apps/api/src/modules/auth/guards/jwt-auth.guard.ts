import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { ErrorCode } from "@baydar/shared";
import type { Request } from "express";
import * as jwt from "jsonwebtoken";

import type { Env } from "../../../config/env";
import type { AuthUser } from "../decorators/current-user.decorator";
import { IS_OPTIONAL_AUTH_KEY } from "../decorators/optional-auth.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: AuthUser["role"];
  locale: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<Env, true>,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const isOptional = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization ?? "";
    const match = /^Bearer\s+(.+)$/.exec(header);
    // EventSource (SSE) in browsers cannot set custom headers, so we also
    // accept `?access_token=` as a fallback. Safe because the token is still
    // signed and short-lived.
    const queryToken =
      typeof req.query?.access_token === "string" ? req.query.access_token : undefined;
    const token = match?.[1] ?? queryToken;

    if (!token) {
      if (isOptional) return true;
      throw unauthorized("Missing bearer token.");
    }

    try {
      const secret = this.config.getOrThrow<string>("JWT_ACCESS_SECRET");
      const payload = jwt.verify(token, secret) as unknown as AccessTokenPayload;

      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        locale: payload.locale,
      };
      return true;
    } catch {
      if (isOptional) return true;
      throw unauthorized("Invalid or expired token.");
    }
  }
}

function unauthorized(message: string): UnauthorizedException {
  return new UnauthorizedException({
    error: { code: ErrorCode.AUTH_UNAUTHORIZED, message },
  });
}
