// Session token minting, split out of auth.service.ts to keep that file under
// the 300-LOC design cap. Pure functions over ConfigService — no Prisma, no
// request state — so they are trivially testable on their own.
import * as crypto from "node:crypto";

import { type AuthTokens } from "@baydar/shared";
import type { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";

import type { Env } from "../../config/env";

import type { AuthUser } from "./decorators/current-user.decorator";

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: AuthUser["role"];
  locale: string;
}

interface TokenSubject {
  id: string;
  email: string;
  role: AuthUser["role"];
  locale: string;
}

/** The one hash for every opaque token we store. Re-exported by auth-tokens.service. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signTokens(config: ConfigService<Env, true>, user: TokenSubject): AuthTokens {
  // ConfigModule is loaded with the zod-parsed env object (app.module.ts), and
  // these are `z.coerce.number()` — so they arrive as numbers. A `numberConfig`
  // helper used to re-parse them here, defending against a string that the
  // schema had already ruled out.
  const accessTtl = config.getOrThrow("JWT_ACCESS_TTL", { infer: true });
  const refreshTtl = config.getOrThrow("JWT_REFRESH_TTL", { infer: true });
  const accessSecret = config.getOrThrow<string>("JWT_ACCESS_SECRET");

  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    locale: user.locale,
  };

  // HS256 pinned on both ends: the guard verifies with the same allowlist, so
  // an alg-confusion token can never round-trip.
  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: accessTtl,
    algorithm: "HS256",
  });

  // Refresh tokens are opaque random strings (we store their hash).
  const refreshToken = crypto.randomBytes(48).toString("base64url");

  const now = Date.now();
  return {
    accessToken,
    refreshToken,
    accessExpiresAt: new Date(now + accessTtl * 1000).toISOString(),
    refreshExpiresAt: new Date(now + refreshTtl * 1000).toISOString(),
  };
}
