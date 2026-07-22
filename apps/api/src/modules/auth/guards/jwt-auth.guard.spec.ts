import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Reflector } from "@nestjs/core";
import * as jwt from "jsonwebtoken";

import type { AuthTokensService } from "../auth-tokens.service";
import type { LastSeenTracker } from "../last-seen.tracker";

import { JwtAuthGuard } from "./jwt-auth.guard";

const SECRET = "x".repeat(48);

function makeGuard(): JwtAuthGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;
  const config = {
    getOrThrow: jest.fn().mockReturnValue(SECRET),
  } as unknown as ConfigService;
  const authTokens = {
    consumeStreamToken: jest.fn(),
  } as unknown as AuthTokensService;
  const lastSeen = { touch: jest.fn() } as unknown as LastSeenTracker;
  return new JwtAuthGuard(reflector, config as never, authTokens, lastSeen);
}

function httpContext(authHeader?: string) {
  const req: { headers: Record<string, string | undefined>; user?: unknown; query?: unknown } = {
    headers: authHeader ? { authorization: authHeader } : {},
    query: {},
  };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    // expose for assertions
    _req: req,
  };
}

describe("JwtAuthGuard algorithm pinning", () => {
  it("accepts a valid HS256 access token", async () => {
    const guard = makeGuard();
    const token = jwt.sign(
      { sub: "u1", email: "a@b.co", role: "USER", locale: "ar-PS" },
      SECRET,
      { algorithm: "HS256", expiresIn: 60 },
    );
    const ctx = httpContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(ctx._req.user).toMatchObject({ id: "u1", email: "a@b.co", role: "USER" });
  });

  it("rejects tokens signed with a non-HS256 algorithm (none)", async () => {
    const guard = makeGuard();
    // Craft unsigned "alg":"none" JWT — verify must reject when algorithms is pinned.
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ sub: "u1", email: "a@b.co", role: "ADMIN", locale: "ar-PS" }),
    ).toString("base64url");
    const noneToken = `${header}.${payload}.`;
    const ctx = httpContext(`Bearer ${noneToken}`);
    await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx._req.user).toBeUndefined();
  });

  it("rejects missing bearer token on protected routes", async () => {
    const guard = makeGuard();
    const ctx = httpContext();
    await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
