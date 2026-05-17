/**
 * Minimal cookie helpers so we can avoid pulling in `cookie-parser` for the
 * single field we actually read on the server (the refresh-token cookie).
 *
 * Spec-compliant enough for our needs: tokenises on `;`, trims surrounding
 * whitespace, returns the first occurrence of a name match. Values are
 * decoded with `decodeURIComponent` to mirror what `cookie-parser` and the
 * browser do.
 */
export function parseCookieHeader(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (key !== name) continue;
    const value = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

export const REFRESH_COOKIE_NAME = "baydar_refresh";

interface SerializeOptions {
  maxAgeSeconds?: number;
  secure?: boolean;
  path?: string;
}

/**
 * Serialise a Set-Cookie value for the refresh token. HttpOnly + SameSite=Lax
 * are non-negotiable; `Secure` is gated on `secure` so dev (http://localhost)
 * still works in browsers that strip Secure cookies on plain HTTP.
 */
export function serializeRefreshCookie(value: string, opts: SerializeOptions = {}): string {
  const segments = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=${opts.path ?? "/api/v1/auth"}`,
  ];
  if (opts.maxAgeSeconds !== undefined) {
    segments.push(`Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`);
  }
  if (opts.secure) segments.push("Secure");
  return segments.join("; ");
}

export function serializeClearedRefreshCookie(opts: SerializeOptions = {}): string {
  return serializeRefreshCookie("", { ...opts, maxAgeSeconds: 0 });
}
