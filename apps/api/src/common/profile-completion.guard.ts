import { ErrorCode, isProfileComplete } from "@baydar/shared";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { DomainException } from "./domain-exception";
import { REQUIRE_COMPLETE_PROFILE_KEY } from "./require-complete-profile.decorator";
import type { AuthUser } from "../modules/auth/decorators/current-user.decorator";
import { PrismaService } from "../modules/prisma/prisma.service";

@Injectable()
export class ProfileCompletionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_COMPLETE_PROFILE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!req.user) {
      throw new DomainException(ErrorCode.AUTH_UNAUTHORIZED, "Missing authenticated user.", 401);
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId: req.user.id },
      select: {
        firstName: true,
        lastName: true,
        handle: true,
        headline: true,
        location: true,
        experiences: { select: { id: true }, take: 1 },
        educations: { select: { id: true }, take: 1 },
      },
    });

    if (!profile || !isProfileComplete(profile)) {
      throw new DomainException(
        ErrorCode.PROFILE_ONBOARDING_REQUIRED,
        "Complete your profile before using Baydar.",
        403,
      );
    }

    return true;
  }
}
