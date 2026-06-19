import type { AuthSession } from "@baydar/shared";
import type { Request, Response } from "express";

import { serializeClearedRefreshCookie, serializeRefreshCookie } from "../../common/cookies";

const TRANSPORT_HEADER = "x-auth-transport";
type Transport = "body" | "cookie";

export function readTransport(req: Request): Transport {
  return req.header(TRANSPORT_HEADER) === "body" ? "body" : "cookie";
}

export function requestMeta(req: Request): { userAgent?: string; ipAddress?: string } {
  return { userAgent: req.get("user-agent"), ipAddress: req.ip };
}

export function clearAuthTransport(req: Request, res: Response): void {
  if (readTransport(req) !== "cookie") return;
  res.setHeader("Set-Cookie", serializeClearedRefreshCookie({ secure: isSecureRequest(req) }));
}

/** Keep web refresh tokens in HttpOnly cookies; mobile explicitly requests body transport. */
export function applyAuthTransport(req: Request, res: Response, session: AuthSession): AuthSession {
  if (readTransport(req) === "body") return session;
  const refreshExpiresMs = Date.parse(session.tokens.refreshExpiresAt) - Date.now();
  res.setHeader(
    "Set-Cookie",
    serializeRefreshCookie(session.tokens.refreshToken, {
      maxAgeSeconds: Math.max(0, Math.floor(refreshExpiresMs / 1000)),
      secure: isSecureRequest(req),
    }),
  );
  return { ...session, tokens: { ...session.tokens, refreshToken: "" } };
}

function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return req.secure || forwardedProto === "https" || process.env.NODE_ENV === "production";
}
