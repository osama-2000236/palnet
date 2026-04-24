import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ErrorCode, type UserRole } from "@palnet/shared";

import type { AuthUser } from "../decorators/current-user.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (request.user && roles.includes(request.user.role)) return true;

    throw new ForbiddenException({
      error: { code: ErrorCode.AUTH_FORBIDDEN, message: "Forbidden." },
    });
  }
}
