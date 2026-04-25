import { ApiError } from "@palnet/shared";
import type { z } from "zod";

export const API_BASE = resolveRequiredBase(
  process.env.NEXT_PUBLIC_API_URL,
  "NEXT_PUBLIC_API_URL",
  "http://localhost:4000/api/v1",
);
export const WS_BASE = resolveRequiredBase(
  process.env.NEXT_PUBLIC_WS_URL,
  "NEXT_PUBLIC_WS_URL",
  "http://localhost:4000",
);

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
  token?: string;
}

export async function apiFetch<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  opts: ApiFetchOptions = {},
): Promise<z.infer<T>> {
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });

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
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (res.ok) return;
  const json = (await res.json().catch(() => ({}))) as unknown;
  const parsed = ApiError.safeParse(json);
  const code = parsed.success ? parsed.data.error.code : "INTERNAL";
  const details = parsed.success ? parsed.data.error.details : undefined;
  throw new ApiRequestError(res.status, code, details);
}

// For paginated endpoints that return `{ data: [...], meta: {...} }` at the top level.
export async function apiFetchPage<T extends z.ZodTypeAny>(
  path: string,
  envelope: T,
  opts: ApiFetchOptions = {},
): Promise<z.infer<T>> {
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const parsed = ApiError.safeParse(json);
    const code = parsed.success ? parsed.data.error.code : "INTERNAL";
    throw new ApiRequestError(res.status, code);
  }
  return envelope.parse(json) as z.infer<T>;
}

function resolveRequiredBase(
  value: string | undefined,
  name: string,
  fallback: string,
): string {
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} missing`);
  }
  return fallback;
}
