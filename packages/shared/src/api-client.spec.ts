/**
 * The HTTP client, tested without a platform.
 *
 * Web's suite (`apps/web/src/lib/__tests__/api-refresh.test.ts`) pins the
 * browser adapter's cookie refresh and still does. What is here is the logic
 * both apps used to own a copy of, including the one place they silently
 * disagreed: a response that does not match its schema.
 */
import { z } from "zod";

import {
  ApiRequestError,
  CLIENT_ERROR_CODE,
  createApiClient,
  type ApiClientAdapter,
  type HttpResponse,
} from "./api-client";

const Payload = z.object({ ok: z.literal(true) });
const Page = z.object({
  data: z.array(Payload),
  meta: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }),
});

const ok = (body: unknown, status = 200): HttpResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

const unauthorized = (): HttpResponse =>
  ok({ error: { code: "AUTH_UNAUTHORIZED", message: "Expired." } }, 401);

interface RecordedCall {
  url: string;
  headers: Record<string, string>;
  method?: string;
  body?: string;
}

/**
 * Queued responses rather than `mockResolvedValueOnce`: that replaces the mock's
 * implementation, so the recording never runs and every assertion about what was
 * *sent* silently reads an empty array.
 */
function harness(overrides: Partial<ApiClientAdapter> = {}) {
  const calls: RecordedCall[] = [];
  const queued: HttpResponse[] = [];

  const fetch = jest.fn((url: string, init: Record<string, unknown>) => {
    calls.push({
      url,
      headers: (init.headers ?? {}) as Record<string, string>,
      method: init.method as string | undefined,
      body: init.body as string | undefined,
    });
    return Promise.resolve(queued.shift() ?? ok({ data: { ok: true } }));
  });

  const refresh = jest.fn(overrides.refresh ?? (() => Promise.resolve("refreshed-token")));
  const getToken = jest.fn(overrides.getToken ?? (() => "stored-token" as string | null));

  const client = createApiClient({
    ...overrides,
    baseUrl: "https://api.test/api/v1",
    fetch: fetch as unknown as ApiClientAdapter["fetch"],
    getToken,
    refresh,
  });

  /** Responses for the next N calls, in order; anything after falls through to a default 200. */
  const respond = (...responses: HttpResponse[]): void => void queued.push(...responses);

  return { client, calls, fetch, refresh, getToken, respond };
}

describe("response decoding", () => {
  it("turns a contract drift into a typed error, not a raw ZodError", async () => {
    // The divergence this client exists to end. Web called `schema.parse`, so a
    // server that changed a field threw a ZodError straight past every error
    // boundary; mobile called `safeParse` and produced something renderable.
    const { client, respond } = harness();
    respond(ok({ data: { ok: "yes, but a string" } }));

    const caught = await client.apiFetch("/thing", Payload).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(ApiRequestError);
    expect(caught).toMatchObject({ status: 0, code: CLIENT_ERROR_CODE.INVALID_RESPONSE });
    expect((caught as Error).name).not.toBe("ZodError");
  });

  it("unwraps `data` for apiFetch but hands apiFetchPage the whole envelope", async () => {
    const { client, respond } = harness();
    const envelope = { data: [{ ok: true }], meta: { nextCursor: null, hasMore: false } };
    respond(ok(envelope));
    await expect(client.apiFetchPage("/feed", Page)).resolves.toEqual(envelope);

    respond(ok({ data: { ok: true } }));
    await expect(client.apiFetch("/thing", Payload)).resolves.toEqual({ ok: true });
  });

  it("decodes the ApiError envelope into the server's code", async () => {
    const { client, respond } = harness();
    respond(ok({ error: { code: "NOT_FOUND", message: "gone" } }, 404));
    await expect(client.apiFetch("/thing", Payload)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("falls back to INTERNAL when the error body is not an ApiError", async () => {
    const { client, respond } = harness();
    respond(ok("<html>502 Bad Gateway</html>", 502));
    await expect(client.apiFetch("/thing", Payload)).rejects.toMatchObject({
      status: 502,
      code: "INTERNAL",
    });
  });
});

describe("auth", () => {
  it("prefers the adapter's stored token over a caller's stale one", async () => {
    const { client, calls } = harness();
    await client.apiFetch("/thing", Payload, { token: "stale-from-component-state" });
    expect(calls[0]!.headers.Authorization).toBe("Bearer stored-token");
  });

  it("falls back to the caller's token when the adapter has none", async () => {
    const { client, calls } = harness({ getToken: () => null });
    await client.apiFetch("/thing", Payload, { token: "caller-token" });
    expect(calls[0]!.headers.Authorization).toBe("Bearer caller-token");
  });

  it("refreshes once on a 401 and retries with the new token", async () => {
    const { client, calls, refresh, respond } = harness();
    respond(unauthorized(), ok({ data: { ok: true } }));

    await expect(client.apiFetch("/thing", Payload)).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls[1]!.headers.Authorization).toBe("Bearer refreshed-token");
  });

  it("does not refresh a second time when the retry is still unauthorized", async () => {
    const { client, fetch, refresh, respond } = harness();
    respond(unauthorized(), unauthorized());

    await expect(client.apiFetch("/thing", Payload)).rejects.toMatchObject({ status: 401 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("queues concurrent 401s behind a single refresh", async () => {
    // Without this, every in-flight request that 401s fires its own refresh —
    // and on mobile each one rotates the refresh token, so the last writer wins
    // and the rest are invalidated.
    const { client, refresh, respond } = harness();
    respond(unauthorized(), unauthorized());

    await Promise.all([client.apiFetch("/a", Payload), client.apiFetch("/b", Payload)]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("gives up when the refresh yields nothing", async () => {
    const { client, fetch, refresh, respond } = harness({ refresh: () => Promise.resolve(null) });
    respond(unauthorized());

    await expect(client.apiFetch("/thing", Payload)).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("skipAuth sends no token and never triggers a refresh", async () => {
    // The refresh call itself uses this. Without it the client would recurse:
    // refresh 401s, which triggers a refresh, which 401s.
    const { client, calls, refresh, respond } = harness();
    respond(unauthorized());

    await expect(
      client.apiCall("/auth/refresh", { method: "POST", skipAuth: true }),
    ).rejects.toMatchObject({ status: 401 });
    expect(calls[0]!.headers.Authorization).toBeUndefined();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes before sending when a session exists but its token did not survive", async () => {
    // The access token lives in memory only. On a cold page load there is a
    // session and no usable token, so sending first is a guaranteed 401, a
    // refresh, and a replay — measured on a real `/feed`, that made every query
    // on the page run twice.
    const { client, calls, refresh } = harness({ getToken: () => null, hasSession: () => true });
    await client.apiFetch("/feed", Payload);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.headers.Authorization).toBe("Bearer refreshed-token");
  });

  it("never calls refresh for a visitor with no session", async () => {
    // The guard on the optimisation above, and it is load-bearing on mobile
    // rather than web: web's `refresh()` returns null without a network call,
    // but mobile's clears the session and routes to /login. Without this a
    // logged-out user on a public screen is bounced to login by any request.
    const { client, calls, refresh } = harness({ getToken: () => null, hasSession: () => false });
    await client.apiFetch("/jobs/public/abc", Payload);

    expect(refresh).not.toHaveBeenCalled();
    expect(calls[0]!.headers.Authorization).toBeUndefined();
  });

  it("getValidAccessToken refreshes only when nothing is stored", async () => {
    const stored = harness();
    await expect(stored.client.getValidAccessToken()).resolves.toBe("stored-token");
    expect(stored.refresh).not.toHaveBeenCalled();

    const empty = harness({ getToken: () => null });
    await expect(empty.client.getValidAccessToken()).resolves.toBe("refreshed-token");
    expect(empty.refresh).toHaveBeenCalledTimes(1);
  });
});

describe("request shaping", () => {
  it("sets Content-Type only when there is a body", async () => {
    const { client, calls } = harness();
    await client.apiFetch("/thing", Payload);
    expect(calls[0]!.headers["Content-Type"]).toBeUndefined();

    await client.apiCall("/thing", { method: "POST", body: { a: 1 } });
    expect(calls[1]!.headers["Content-Type"]).toBe("application/json");
    expect(calls[1]!.body).toBe('{"a":1}');
  });

  it("applies the adapter's headers, and lets a caller override them", async () => {
    const { client, calls } = harness({ headers: { "X-Auth-Transport": "body" } });
    await client.apiFetch("/thing", Payload, { headers: { "X-Auth-Transport": "cookie" } });
    expect(calls[0]!.headers["X-Auth-Transport"]).toBe("cookie");
  });

  it("rewrites GET paths only — a POST body must not be cache-busted", async () => {
    const { client, calls } = harness({ rewriteGetPath: (p) => `${p}?_=1` });
    await client.apiFetch("/thing", Payload);
    await client.apiCall("/thing", { method: "POST", body: {} });

    expect(calls[0]!.url).toBe("https://api.test/api/v1/thing?_=1");
    expect(calls[1]!.url).toBe("https://api.test/api/v1/thing");
  });
});

describe("adapter headers", () => {
  it("sends a static header record on every request", async () => {
    const { client, calls } = harness({ headers: { "X-Client": "web" } });
    await client.apiCall("/one");
    await client.apiCall("/two");
    expect(calls.map((c) => c.headers["X-Client"])).toEqual(["web", "web"]);
  });

  // The reason `headers` may be a function at all. A member who starts on wifi
  // and walks onto 2G must stop asking for 1080px images on the next request,
  // not at the next cold start — a static object is captured once, and the
  // connection hint would be stale for the rest of the session.
  it("re-resolves a header function per request", async () => {
    let connection = "fast";
    const { client, calls } = harness({
      headers: () => ({ "X-Baydar-Connection": connection }),
    });

    await client.apiCall("/one");
    connection = "slow";
    await client.apiCall("/two");

    expect(calls.map((c) => c.headers["X-Baydar-Connection"])).toEqual(["fast", "slow"]);
  });

  it("lets a per-call header win over the adapter's", async () => {
    const { client, calls } = harness({ headers: () => ({ "X-Baydar-Connection": "fast" }) });
    await client.apiCall("/one", { headers: { "X-Baydar-Connection": "slow" } });
    expect(calls[0]!.headers["X-Baydar-Connection"]).toBe("slow");
  });
});
