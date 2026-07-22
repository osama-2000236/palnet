import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Reflector } from "@nestjs/core";
import * as jwt from "jsonwebtoken";

import type { AuthTokensService } from "../auth-tokens.service";
import type { LastSeenTracker } from "../last-seen.tracker";

import { JwtAuthGuard } from "./jwt-auth.guard";

const SECRET = "x".repeat(48);

function makeGuard(): JwtAuthGuard {
  return new JwtAuthGuard(
    { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector,
    { getOrThrow: jest.fn().mockReturnValue(SECRET) } as unknown as ConfigService as never,
    { consumeStreamToken: jest.fn() } as unknown as AuthTokensService,
    { touch: jest.fn() } as unknown as LastSeenTracker,
  );
}

function ctx(auth?: string) {
  const req: { headers: Record<string, string | undefined>; user?: unknown; query: object } = {
    headers: auth ? { authorization: auth } : {},
    query: {},
  };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
    _req: req,
  };
}

describe("JwtAuthGuard HS256 pin", () => {
  it("accepts HS256 and rejects alg=none", async () => {
    const guard = makeGuard();
    const token = jwt.sign(
      { sub: "u1", email: "a@b.co", role: "USER", locale: "ar-PS" },
      SECRET,
      { algorithm: "HS256", expiresIn: 60 },
    );
    const ok = ctx(`Bearer ${token}`);
    await expect(guard.canActivate(ok as never)).resolves.toBe(true);
    expect(ok._req.user).toMatchObject({ id: "u1" });

    const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: "u1", email: "a@b.co", role: "ADMIN", locale: "ar-PS" })).toString("base64url")}.`;
    const bad = ctx(`Bearer ${none}`);
    await expect(guard.canActivate(bad as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
