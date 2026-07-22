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

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function numberConfig(
  config: ConfigService<Env, true>,
  key: keyof Pick<Env, "BCRYPT_COST" | "JWT_ACCESS_TTL" | "JWT_REFRESH_TTL">,
): number {
  const value = config.getOrThrow<number | string>(key);
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric config value: ${key}`);
  }
  return parsed;
}

export function signTokens(config: ConfigService<Env, true>, user: TokenSubject): AuthTokens {
  const accessTtl = numberConfig(config, "JWT_ACCESS_TTL");
  const refreshTtl = numberConfig(config, "JWT_REFRESH_TTL");
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
