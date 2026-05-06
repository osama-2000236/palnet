import { ErrorCode, type StreamTokenScope } from "@baydar/shared";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import * as jwt from "jsonwebtoken";

import type { Env } from "../../../config/env";
import { AuthTokensService } from "../auth-tokens.service";
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
    private readonly authTokens: AuthTokensService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
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
    const token = match?.[1];

    if (token) {
      return this.activateBearer(req, token, isOptional);
    }

    const streamToken = stringQueryValue(req.query?.token);
    if (streamToken) {
      const scope = streamScopeForRequest(req);
      if (!scope) throw streamTokenInvalid();
      const user = await this.authTokens.consumeStreamToken(streamToken, scope);
      req.user = user;
      return true;
    }

    if (isOptional) return true;
    throw unauthorized("Missing bearer token.");
  }

  private activateBearer(
    req: Request & { user?: AuthUser },
    token: string,
    isOptional: boolean | undefined,
  ): boolean {
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

function streamTokenInvalid(): UnauthorizedException {
  return new UnauthorizedException({
    error: { code: ErrorCode.STREAM_TOKEN_INVALID, message: "Stream token invalid." },
  });
}

function stringQueryValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function streamScopeForRequest(req: Request): StreamTokenScope | null {
  const path = req.path || req.originalUrl?.split("?")[0] || req.url.split("?")[0] || "";
  if (path.endsWith("/messaging/stream")) return "messaging";
  if (path.endsWith("/notifications/stream")) return "notifications";
  return null;
}
