import { SetMetadata } from "@nestjs/common";

// Routes that a suspended user can still hit: /auth/me, /auth/logout, and
// the appeal-submission endpoint. Everything else is blocked by
// SuspensionGuard while `suspendedAt` is set.
export const ALLOW_SUSPENDED_KEY = "allow-suspended";
export const AllowSuspended = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_SUSPENDED_KEY, true);
