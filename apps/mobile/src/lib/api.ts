import { ApiError } from "@palnet/shared";
import type { z } from "zod";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

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

  const res = await fetch(`${BASE}${path}`, {
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
