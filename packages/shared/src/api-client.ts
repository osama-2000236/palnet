import type { z } from "zod";

import { ErrorCode } from "./enums";
import { ApiError } from "./errors";

/**
 * The HTTP client both apps talk to the API through.
 *
 * Web and mobile each had their own copy. They agreed on the shape and
 * disagreed on the behaviour that matters: web called `schema.parse`, so a
 * server contract drift threw a raw `ZodError` past every error boundary, while
 * mobile called `safeParse` and produced a typed error the UI could render.
 * Nobody decided that — it is an artefact of writing the file twice. Mobile was
 * right, and that is what this does.
 *
 * What genuinely differs per platform stays in the adapter: where the token
 * lives (memory + localStorage on web, SecureStore on mobile), how a refresh is
 * proven (an httpOnly cookie on web, a refresh token in the body on mobile),
 * and the headers each runtime needs.
 */

/**
 * The response surface this module uses. Declared structurally because
 * `packages/shared` compiles against `lib: ["ES2022"]` and nothing else — see
 * `sse-retry.ts` for why that is worth keeping.
 */
export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface HttpRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  credentials?: string;
  cache?: string;
}

export type HttpFetch = (url: string, init: HttpRequestInit) => Promise<HttpResponse>;

/**
 * Client-side error codes. Not in `ErrorCode` — the server never sends these,
 * they are produced here when a response cannot be trusted or never arrived.
 */
export const CLIENT_ERROR_CODE = {
  /** The response did not match its schema: a server contract drift. */
  INVALID_RESPONSE: "INVALID_RESPONSE",
  /** The request never completed: offline, DNS, CORS, a refused connection. */
  NETWORK_ERROR: "NETWORK_ERROR",
} as const;

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(`API ${status} ${code}`);
    this.name = "ApiRequestError";
  }
}

export interface ApiFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  /**
   * Fallback token, used only when the adapter has none stored. Callers hold
   * tokens in component state and go stale; whatever the adapter has is at
   * least as fresh, so it wins.
   */
  token?: string | null;
  /** Send unauthenticated, and do not attempt a refresh on 401. */
  skipAuth?: boolean;
}

export interface ApiClientAdapter {
  baseUrl: string;
  /** Injected rather than taken from a global so this module stays runtime-free. */
  fetch: HttpFetch;
  /** The current access token. Resolved per request, never captured. */
  getToken(): string | null | Promise<string | null>;
  /**
   * Exchange the stored refresh credential for a fresh access token. Resolve
   * `null` when there is nothing left to refresh with — the adapter owns what
   * that means (clearing the session, redirecting to login).
   */
  refresh(): Promise<string | null>;
  /** Headers added to every request. */
  headers?: Record<string, string>;
  /** Extra `fetch` init on every request (web needs `credentials: "include"`). */
  init?: HttpRequestInit;
  /** Rewrite a GET path — mobile busts an OkHttp cache here. */
  rewriteGetPath?(path: string): string;
}

export interface ApiClient {
  apiFetch<T extends z.ZodTypeAny>(
    path: string,
    schema: T,
    opts?: ApiFetchOptions,
  ): Promise<z.infer<T>>;
  /** For endpoints returning 204, or where the response body is not needed. */
  apiCall(path: string, opts?: ApiFetchOptions): Promise<void>;
  /** For paginated endpoints returning `{ data: [...], meta: {...} }` at the top level. */
  apiFetchPage<T extends z.ZodTypeAny>(
    path: string,
    envelope: T,
    opts?: ApiFetchOptions,
  ): Promise<z.infer<T>>;
  /**
   * The current access token, refreshing first if there is none. Used by the
   * SSE stream-token mint, which needs a token before any request has run.
   */
  getValidAccessToken(): Promise<string | null>;
}

function errorFrom(status: number, json: unknown): ApiRequestError {
  const parsed = ApiError.safeParse(json);
  return new ApiRequestError(
    status,
    parsed.success ? parsed.data.error.code : ErrorCode.INTERNAL,
    parsed.success ? parsed.data.error.details : undefined,
  );
}

export function createApiClient(adapter: ApiClientAdapter): ApiClient {
  // Single-flight: concurrent 401s queue behind one refresh instead of racing
  // each other into a token stampede.
  let refreshing: Promise<string | null> | null = null;

  const refreshOnce = async (): Promise<string | null> => {
    refreshing ??= adapter.refresh().finally(() => {
      refreshing = null;
    });
    return refreshing;
  };

  const usable = (token: string | null | undefined): string | null =>
    token?.trim() ? token : null;

  const tokenFor = async (opts: ApiFetchOptions): Promise<string | null> => {
    if (opts.skipAuth) return null;
    return usable(await adapter.getToken()) ?? usable(opts.token);
  };

  const send = async (
    path: string,
    opts: ApiFetchOptions,
    token: string | null,
  ): Promise<HttpResponse> => {
    const method = opts.method?.toUpperCase() ?? "GET";
    const requestPath =
      adapter.rewriteGetPath && (method === "GET" || method === "HEAD")
        ? adapter.rewriteGetPath(path)
        : path;

    const headers: Record<string, string> = { ...adapter.headers, ...opts.headers };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    return adapter.fetch(`${adapter.baseUrl}${requestPath}`, {
      ...adapter.init,
      ...(opts.method === undefined ? {} : { method: opts.method }),
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  };

  /** One request, one refresh-and-retry on 401, then the decoded body or a typed throw. */
  const request = async (path: string, opts: ApiFetchOptions): Promise<unknown> => {
    let res = await send(path, opts, await tokenFor(opts));
    let json = (await res.json().catch(() => ({}))) as unknown;

    if (res.status === 401 && !opts.skipAuth) {
      const refreshed = await refreshOnce();
      if (refreshed) {
        res = await send(path, opts, refreshed);
        json = (await res.json().catch(() => ({}))) as unknown;
      }
    }

    if (!res.ok) throw errorFrom(res.status, json);
    return json;
  };

  /**
   * Always `safeParse`. A response that does not match its schema is a server
   * contract drift, and the client's job is to surface it as an error the UI can
   * render — not to throw a `ZodError` through every boundary above it.
   */
  const decode = <T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> => {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRequestError(0, CLIENT_ERROR_CODE.INVALID_RESPONSE, parsed.error.flatten());
    }
    return parsed.data as z.infer<T>;
  };

  return {
    async apiFetch(path, schema, opts = {}) {
      const json = await request(path, opts);
      return decode(schema, (json as { data?: unknown }).data ?? json);
    },

    async apiCall(path, opts = {}) {
      await request(path, opts);
    },

    async apiFetchPage(path, envelope, opts = {}) {
      return decode(envelope, await request(path, opts));
    },

    async getValidAccessToken() {
      const stored = await adapter.getToken();
      return stored?.trim() ? stored : refreshOnce();
    },
  };
}
