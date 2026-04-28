import { ApiError, AuthSession } from "@baydar/shared";
import { router } from "expo-router";
import type { z } from "zod";

import { clearSession, getAccessToken, getDeviceId, readSession, writeSession } from "./session";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

let refreshPromise: Promise<string> | null = null;

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(`API ${status} ${code}`);
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string | null;
  skipAuth?: boolean;
}

export async function apiFetch<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  opts: ApiFetchOptions = {},
): Promise<z.infer<T>> {
  const res = await requestWithAuth(path, opts);

  const json = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    const parsed = ApiError.safeParse(json);
    const code = parsed.success ? parsed.data.error.code : "INTERNAL";
    const details = parsed.success ? parsed.data.error.details : undefined;
    throw new ApiRequestError(res.status, code, details);
  }

  const body = (json as { data?: unknown }).data ?? json;
  return schema.parse(body) as z.infer<T>;
}

// For mutation endpoints returning 204 No Content (or where the response body is not needed).
export async function apiCall(path: string, opts: ApiFetchOptions = {}): Promise<void> {
  const res = await requestWithAuth(path, opts);
  if (res.ok) return;
  const json = (await res.json().catch(() => ({}))) as unknown;
  const parsed = ApiError.safeParse(json);
  const code = parsed.success ? parsed.data.error.code : "INTERNAL";
  const details = parsed.success ? parsed.data.error.details : undefined;
  throw new ApiRequestError(res.status, code, details);
}

export async function apiFetchPage<T extends z.ZodTypeAny>(
  path: string,
  envelope: T,
  opts: ApiFetchOptions = {},
): Promise<z.infer<T>> {
  const res = await requestWithAuth(path, opts);
  const json = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const parsed = ApiError.safeParse(json);
    const code = parsed.success ? parsed.data.error.code : "INTERNAL";
    throw new ApiRequestError(res.status, code);
  }
  return envelope.parse(json) as z.infer<T>;
}

async function requestWithAuth(path: string, opts: ApiFetchOptions): Promise<Response> {
  const token = opts.skipAuth
    ? null
    : opts.token === undefined
      ? await getAccessToken()
      : opts.token;
  const res = await request(path, opts, token);
  if (res.status !== 401 || opts.skipAuth) return res;

  const nextToken = await refreshAccessToken();
  if (!nextToken) return res;
  return request(path, opts, nextToken);
}

async function request(
  path: string,
  opts: ApiFetchOptions,
  token: string | null,
): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const { body, token: _token, skipAuth: _skipAuth, ...init } = opts;
  void _token;
  void _skipAuth;

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshSession()
      .then((session) => session.tokens.accessToken)
      .finally(() => {
        refreshPromise = null;
      });
  }
  try {
    return await refreshPromise;
  } catch {
    await clearSession();
    router.replace("/(auth)/login");
    return null;
  }
}

async function refreshSession(): Promise<z.infer<typeof AuthSession>> {
  const session = await readSession();
  if (!session?.tokens.refreshToken) {
    throw new ApiRequestError(401, "AUTH_UNAUTHORIZED");
  }

  const res = await request(
    "/auth/refresh",
    {
      method: "POST",
      body: {
        refreshToken: session.tokens.refreshToken,
        deviceId: await getDeviceId(),
      },
      skipAuth: true,
    },
    null,
  );
  const json = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const parsed = ApiError.safeParse(json);
    throw new ApiRequestError(
      res.status,
      parsed.success ? parsed.data.error.code : "AUTH_UNAUTHORIZED",
      parsed.success ? parsed.data.error.details : undefined,
    );
  }

  const body = (json as { data?: unknown }).data ?? json;
  const next = AuthSession.parse(body);
  await writeSession(next);
  return next;
}
