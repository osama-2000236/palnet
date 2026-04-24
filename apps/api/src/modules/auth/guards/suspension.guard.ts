import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ErrorCode } from "@palnet/shared";
import type { Request } from "express";

import { DomainException } from "../../../common/domain-exception";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../decorators/current-user.decorator";
import { ALLOW_SUSPENDED_KEY } from "../decorators/allow-suspended.decorator";

// Blocks any mutating request from a suspended user.
//
// Runs after JwtAuthGuard. The JWT payload is cached at issue time so we
// cannot trust it for an "is suspended now?" check — a freshly suspended
// user would still hold a valid token. Instead we query `User.suspendedAt`
// once per request. GETs pass through so the user can still read their own
// profile, the audit explainer, and pull the appeal form. Writes are 403
// with `USER_SUSPENDED` unless the handler opts in via @AllowSuspended()
// (logout, /auth/me, POST /reports/:id/appeal).
@Injectable()
export class SuspensionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    // No auth user → JwtAuthGuard already decided (public or optional).
    if (!user) return true;

    // Reads always allowed. The guard exists to stop abuse, not to freeze
    // the UI of a suspended account.
    if (req.method === "GET" || req.method === "HEAD") return true;

    const allow = this.reflector.getAllAndOverride<boolean>(ALLOW_SUSPENDED_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (allow) return true;

    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { suspendedAt: true, suspendedReason: true },
    });
    if (!row?.suspendedAt) return true;

    throw new DomainException(
      ErrorCode.USER_SUSPENDED,
      row.suspendedReason ? `Account suspended: ${row.suspendedReason}` : "Account suspended.",
      403,
    );
  }
}
