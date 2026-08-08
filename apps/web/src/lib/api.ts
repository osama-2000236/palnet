import { connectionHeaders, createApiClient, type ApiFetchOptions } from "@baydar/shared";

import {
  clearSession,
  getAccessToken,
  getDeviceId,
  readSession,
  setAccessToken,
  writeSession,
} from "./session";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export { ApiRequestError } from "@baydar/shared";
export type { ApiFetchOptions };

/**
 * The browser half of the API client. The request/refresh/decode logic lives in
 * `@baydar/shared` so it cannot drift from mobile's copy again; what is here is
 * what genuinely differs.
 *
 * The refresh is proven by an httpOnly cookie, which is why the body carries
 * only a device id and every request sends `credentials: "include"`.
 */

/** Memory first, then the stored session — hydrating memory when it wins. */
function currentToken(): string | null {
  const memory = getAccessToken()?.trim();
  if (memory) return memory;

  const stored = readSession()?.tokens.accessToken?.trim();
  if (stored) {
    setAccessToken(stored);
    return stored;
  }
  return null;
}

async function refresh(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const session = readSession();
  if (!session) return null;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });
  if (!res.ok) {
    clearSession();
    return null;
  }

  const json = (await res.json().catch(() => ({}))) as { data?: Partial<typeof session> };
  const tokens = json.data?.tokens;
  const accessToken = tokens?.accessToken?.trim();
  if (!accessToken) {
    clearSession();
    return null;
  }

  writeSession({
    ...session,
    user: json.data?.user ?? session.user,
    tokens: { ...session.tokens, ...tokens, accessToken },
  });
  setAccessToken(accessToken);
  return accessToken;
}

export const apiClient = createApiClient({
  baseUrl: BASE,
  // `Headers` rather than the plain record the shared client hands over: that
  // is what the browser's fetch wants, and what the suite asserts on.
  fetch: (url, init) => fetch(url, { ...init, headers: new Headers(init.headers) } as RequestInit),
  getToken: currentToken,
  refresh,
  hasSession: () => readSession() !== null,
  // Resolved per request, not captured: a member who walks from wifi onto 2G
  // must stop being sent 1080px images on the next request, not the next load.
  headers: connectionHeaders,
  init: { credentials: "include" },
});

export const { apiFetch, apiCall, apiFetchPage, getValidAccessToken } = apiClient;

/**
 * User-initiated sign-out. Revokes this device's refresh token server-side
 * before dropping the local copy: `clearSession()` on its own leaves the token
 * valid until it expires, and Settings → Security keeps listing the device as
 * active because `listSessions()` filters on `revokedAt: null`.
 *
 * Best-effort — a failed revoke must still sign the user out locally, or a
 * network blip strands them inside an authenticated shell.
 */
export async function signOut(): Promise<void> {
  const token = await getValidAccessToken().catch(() => null);
  if (token) {
    await apiCall("/auth/logout", {
      method: "POST",
      token,
      body: { deviceId: getDeviceId() },
    }).catch(() => undefined);
  }
  clearSession();
}
