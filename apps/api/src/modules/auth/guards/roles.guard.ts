import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      // No roles specified, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | {
          role: string;
        }
      | undefined;

    if (!user?.role) {
      throw new ForbiddenException();
    }

    return requiredRoles.includes(user.role);
  }
}
