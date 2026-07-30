import {
  ApiRequestError,
  AuthSession,
  CLIENT_ERROR_CODE,
  createApiClient,
  type ApiFetchOptions,
} from "@baydar/shared";
import { router } from "expo-router";

import { clearSession, getAccessToken, getDeviceId, readSession, writeSession } from "./session";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export { ApiRequestError };
export type { ApiFetchOptions };

/**
 * The React Native half of the API client. The request/refresh/decode logic
 * lives in `@baydar/shared` so it cannot drift from web's copy again; what is
 * here is what genuinely differs.
 *
 * Mobile has no cookie jar, so the refresh token travels in the body and the
 * server is opted into returning it there via `X-Auth-Transport`.
 */

const MOBILE_HEADERS: Record<string, string> = {
  // Mobile has no cookie jar — opt the API into returning refresh tokens in the
  // JSON body. The server's default transport is an httpOnly cookie for web.
  "X-Auth-Transport": "body",
  // React Native/OkHttp can replay ETag validators and return 304 responses
  // without exposing the cached JSON body to JS. Every response here is
  // schema-validated before rendering, so a body-less 304 is a hard failure.
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

// ponytail: query-string cache buster, because the headers above are not enough
// on their own — OkHttp still replays conditional requests. Drop it when RN's
// fetch stops handing JS a 304 with no body.
function bustCache(path: string): string {
  const url = new URL(path, "https://baydar.local");
  url.searchParams.set("_", String(Date.now()));
  return `${url.pathname}${url.search}`;
}

export const apiClient = createApiClient({
  baseUrl: API_BASE,
  fetch: async (url, init) => {
    const headers = new Headers(init.headers);
    // Strip validators OkHttp would otherwise attach for us.
    headers.delete("If-None-Match");
    headers.delete("If-Modified-Since");
    try {
      return await fetch(url, { ...init, headers, cache: "no-store" } as RequestInit);
    } catch (error) {
      // ponytail: web lets the raw TypeError through and maps it in
      // `error-message.ts`. Unify when the two message catalogs merge — the web
      // catalog keys this as `errors.NETWORK`, mobile as `NETWORK_ERROR`.
      throw new ApiRequestError(0, CLIENT_ERROR_CODE.NETWORK_ERROR, error);
    }
  },
  getToken: getAccessToken,
  refresh,
  hasSession: async () => (await readSession()) !== null,
  headers: MOBILE_HEADERS,
  rewriteGetPath: bustCache,
});

async function refresh(): Promise<string | null> {
  const session = await readSession();
  const refreshToken = session?.tokens.refreshToken;
  if (!refreshToken) {
    await clearSession();
    router.replace("/(auth)/login");
    return null;
  }

  try {
    const next = await apiClient.apiFetch("/auth/refresh", AuthSession, {
      method: "POST",
      body: { refreshToken, deviceId: await getDeviceId() },
      skipAuth: true,
    });
    await writeSession(next);
    return next.tokens.accessToken;
  } catch {
    await clearSession();
    router.replace("/(auth)/login");
    return null;
  }
}

export const { apiFetch, apiCall, apiFetchPage, getValidAccessToken } = apiClient;

/**
 * User-initiated sign-out — web twin in `apps/web/src/lib/api.ts`. Revokes this
 * device's refresh token server-side before dropping the local copy:
 * `clearSession()` on its own leaves the token valid until it expires, and
 * Settings → Security keeps listing the device as active because
 * `listSessions()` filters on `revokedAt: null`.
 *
 * Best-effort — a failed revoke must still sign the user out locally, or a
 * network blip strands them inside an authenticated shell.
 */
export async function signOut(): Promise<void> {
  const token = await getAccessToken();
  if (token) {
    await apiClient
      .apiCall("/auth/logout", {
        method: "POST",
        token,
        body: { deviceId: await getDeviceId() },
      })
      .catch(() => undefined);
  }
  await clearSession();
}
