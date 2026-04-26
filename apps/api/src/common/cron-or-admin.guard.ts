import { timingSafeEqual } from "node:crypto";

import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ErrorCode, type UserRole } from "@palnet/shared";
import type { Request } from "express";

import type { Env } from "../config/env";
import type { AuthUser } from "../modules/auth/decorators/current-user.decorator";

@Injectable()
export class CronOrAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (isAdmin(user?.role)) return true;

    const secret = this.config.get<string>("CRON_SECRET");
    const header = req.headers.authorization ?? "";
    const match = /^Bearer\s+(.+)$/.exec(header);
    const presented = match?.[1];
    if (secret && presented) {
      const expected = Buffer.from(secret);
      const actual = Buffer.from(presented);
      if (actual.length === expected.length && timingSafeEqual(actual, expected)) return true;
    }

    if (user) {
      throw new ForbiddenException({
        error: {
          code: ErrorCode.AUTH_FORBIDDEN,
          message: "Forbidden.",
        },
      });
    }

    throw new UnauthorizedException({
      error: {
        code: ErrorCode.AUTH_UNAUTHORIZED,
        message: "Missing cron secret.",
      },
    });
  }
}

function isAdmin(role: UserRole | undefined): boolean {
  return role === "MODERATOR" || role === "ADMIN";
}
