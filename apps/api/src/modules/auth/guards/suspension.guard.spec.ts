import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { ErrorCode } from "@baydar/shared";

import { DomainException } from "../../../common/domain-exception";
import type { PrismaService } from "../../prisma/prisma.service";

import { SuspensionGuard } from "./suspension.guard";

// Minimal ExecutionContext builder. SuspensionGuard only touches
// switchToHttp().getRequest(), getHandler(), and getClass() — the rest of the
// Nest surface is irrelevant to the guard, so we stub just those.
function buildCtx(opts: { method: string; user?: { id: string } | undefined }): ExecutionContext {
  const req = { method: opts.method, user: opts.user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class Dummy {},
  } as unknown as ExecutionContext;
}

describe("SuspensionGuard", () => {
  let guard: SuspensionGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    prisma = { user: { findUnique: jest.fn() } };
    guard = new SuspensionGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  it("passes when no auth user is attached (public route)", async () => {
    const ctx = buildCtx({ method: "POST", user: undefined });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("passes GET without consulting the database", async () => {
    const ctx = buildCtx({ method: "GET", user: { id: "u_1" } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("passes HEAD without consulting the database", async () => {
    const ctx = buildCtx({ method: "HEAD", user: { id: "u_1" } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("respects @AllowSuspended() and skips the suspension lookup", async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = buildCtx({ method: "POST", user: { id: "u_1" } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("passes non-suspended users on mutating requests", async () => {
    prisma.user.findUnique.mockResolvedValue({ suspendedAt: null, suspendedReason: null });
    const ctx = buildCtx({ method: "POST", user: { id: "u_1" } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u_1" },
      select: { suspendedAt: true, suspendedReason: true },
    });
  });

  it("throws USER_SUSPENDED (403) with the reason message on a mutating request", async () => {
    prisma.user.findUnique.mockResolvedValue({
      suspendedAt: new Date("2026-04-20T00:00:00Z"),
      suspendedReason: "harassment",
    });
    const ctx = buildCtx({ method: "POST", user: { id: "u_1" } });

    const run = guard.canActivate(ctx);
    await expect(run).rejects.toBeInstanceOf(DomainException);
    await run.catch((err: DomainException) => {
      expect(err.code).toBe(ErrorCode.USER_SUSPENDED);
      expect(err.getStatus()).toBe(403);
      const body = err.getResponse() as { error: { message: string } };
      expect(body.error.message).toContain("harassment");
    });
  });

  it("throws USER_SUSPENDED with a generic message when no reason is stored", async () => {
    prisma.user.findUnique.mockResolvedValue({
      suspendedAt: new Date("2026-04-20T00:00:00Z"),
      suspendedReason: null,
    });
    const ctx = buildCtx({ method: "PATCH", user: { id: "u_1" } });

    await guard.canActivate(ctx).catch((err: DomainException) => {
      expect(err.code).toBe(ErrorCode.USER_SUSPENDED);
      const body = err.getResponse() as { error: { message: string } };
      expect(body.error.message).toBe("Account suspended.");
    });
  });
});
