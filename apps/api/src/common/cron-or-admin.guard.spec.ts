import type { ExecutionContext } from "@nestjs/common";

import { CronOrAdminGuard } from "./cron-or-admin.guard";

describe("CronOrAdminGuard", () => {
  function guard(secret = "x".repeat(32)): CronOrAdminGuard {
    return new CronOrAdminGuard({
      get: jest.fn((key: string) => (key === "CRON_SECRET" ? secret : undefined)),
    } as never);
  }

  function ctx(req: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext;
  }

  it("allows admins", () => {
    expect(
      guard().canActivate(
        ctx({
          user: { role: "ADMIN" },
          headers: {},
        }),
      ),
    ).toBe(true);
  });

  it("allows cron bearer secret", () => {
    const secret = "s".repeat(32);
    expect(
      guard(secret).canActivate(
        ctx({
          headers: { authorization: `Bearer ${secret}` },
        }),
      ),
    ).toBe(true);
  });

  it("rejects unauthenticated calls without the cron secret", () => {
    // NestJS HttpException stringifies to its class name, not the
    // structured payload. Read the response body off the thrown error
    // so we can assert the actual message we shipped.
    try {
      guard().canActivate(ctx({ headers: {} }));
      throw new Error("guard did not throw");
    } catch (err) {
      const payload = (err as { getResponse?: () => unknown }).getResponse?.();
      expect(payload).toMatchObject({
        error: { message: "Missing cron secret." },
      });
    }
  });

  it("rejects authenticated non-admin users", () => {
    try {
      guard().canActivate(
        ctx({
          user: { role: "USER" },
          headers: {},
        }),
      );
      throw new Error("guard did not throw");
    } catch (err) {
      const payload = (err as { getResponse?: () => unknown }).getResponse?.();
      expect(payload).toMatchObject({
        error: { message: "Forbidden." },
      });
    }
  });
});
