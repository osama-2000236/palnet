import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ErrorCode, UserRole } from "@palnet/shared";

import { RolesGuard } from "./roles.guard";

function contextWithRole(role?: UserRole): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestClass {},
    switchToHttp: () => ({
      getRequest: () => ({
        user: role
          ? {
              id: "user_1",
              email: "user@example.com",
              role,
              locale: "en",
            }
          : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("allows routes without role metadata", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithRole(UserRole.USER))).toBe(true);
  });

  it("allows matching moderator/admin roles", () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([UserRole.MODERATOR, UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithRole(UserRole.MODERATOR))).toBe(true);
    expect(guard.canActivate(contextWithRole(UserRole.ADMIN))).toBe(true);
  });

  it("throws AUTH_FORBIDDEN on mismatch", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(contextWithRole(UserRole.USER))).toThrow(
      ForbiddenException,
    );
    try {
      guard.canActivate(contextWithRole(UserRole.USER));
    } catch (e) {
      expect((e as ForbiddenException).getResponse()).toEqual({
        error: { code: ErrorCode.AUTH_FORBIDDEN, message: "Forbidden." },
      });
    }
  });
});
