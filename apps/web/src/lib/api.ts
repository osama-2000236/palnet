import { ApiError } from "@baydar/shared";
import type { z } from "zod";
import { getAccessToken, getDeviceId, readSession, setAccessToken, writeSession } from "./session";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

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
}

function usableToken(token: string | null | undefined): string | null {
  const trimmed = token?.trim();
  return trimmed ? trimmed : null;
}

function currentToken(opts: ApiFetchOptions): string | null {
  const memoryToken = usableToken(getAccessToken());
  if (memoryToken) return memoryToken;

  const sessionToken = usableToken(readSession()?.tokens.accessToken);
  if (sessionToken) {
    setAccessToken(sessionToken);
    return sessionToken;
  }

  return usableToken(opts.token);
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const currentSession = readSession();
  if (!currentSession) return null;

  const refreshRes = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });
  if (!refreshRes.ok) return null;

  const refreshJson = (await refreshRes.json().catch(() => ({}))) as {
    data?: Partial<typeof currentSession>;
  };
  const nextTokens = refreshJson.data?.tokens;
  const nextAccessToken = usableToken(nextTokens?.accessToken);
  if (!nextAccessToken) return null;

  writeSession({
    ...currentSession,
    user: refreshJson.data?.user ?? currentSession.user,
    tokens: {
      ...currentSession.tokens,
      ...nextTokens,
      accessToken: nextAccessToken,
    },
  });
  setAccessToken(nextAccessToken);
  return nextAccessToken;
}

export async function getValidAccessToken(): Promise<string | null> {
  return currentToken({}) ?? refreshAccessToken();
}

function buildHeaders(opts: ApiFetchOptions, token: string | null): Headers {
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function send(path: string, opts: ApiFetchOptions, token: string | null): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: buildHeaders(opts, token),
    credentials: opts.credentials ?? "include",
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

function errorFrom(status: number, json: unknown): ApiRequestError {
  const parsed = ApiError.safeParse(json);
  const code = parsed.success ? parsed.data.error.code : "INTERNAL";
  const details = parsed.success ? parsed.data.error.details : undefined;
  return new ApiRequestError(status, code, details);
}

async function jsonWithAuthRetry(path: string, opts: ApiFetchOptions): Promise<unknown> {
  const firstToken = currentToken(opts);
  let res = await send(path, opts, firstToken);
  let json = (await res.json().catch(() => ({}))) as unknown;

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await send(path, { ...opts, token: refreshed }, refreshed);
      json = (await res.json().catch(() => ({}))) as unknown;
    }
  }

  if (!res.ok) throw errorFrom(res.status, json);
  return json;
}

export async function apiFetch<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  opts: ApiFetchOptions = {},
): Promise<z.infer<T>> {
  const json = await jsonWithAuthRetry(path, opts);
  const body = (json as { data?: unknown }).data ?? json;
  return schema.parse(body) as z.infer<T>;
}

// For mutation endpoints returning 204 No Content (or where the response body is not needed).
export async function apiCall(path: string, opts: ApiFetchOptions = {}): Promise<void> {
  await jsonWithAuthRetry(path, opts);
}

// For paginated endpoints that return `{ data: [...], meta: {...} }` at the top level.
export async function apiFetchPage<T extends z.ZodTypeAny>(
  path: string,
  envelope: T,
  opts: ApiFetchOptions = {},
): Promise<z.infer<T>> {
  const json = await jsonWithAuthRetry(path, opts);
  return envelope.parse(json) as z.infer<T>;
}
