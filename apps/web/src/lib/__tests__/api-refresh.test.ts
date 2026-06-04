import type { AuthSession as AuthSessionType } from "@baydar/shared";
import { z } from "zod";

import { apiCall, apiFetch, apiFetchPage, getValidAccessToken } from "../api";
import { clearAccessToken, getAccessToken, readSession, writeSession } from "../session";

const OkPayload = z.object({ ok: z.literal(true) });
const OkPage = z.object({
  data: z.array(OkPayload),
  meta: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

const apiBase = "http://localhost:4000/api/v1";

const makeSession = (accessToken: string): AuthSessionType => ({
  user: {
    id: "cm00000000000000000000001",
    email: "user@example.com",
    role: "USER",
    locale: "ar-PS",
  },
  tokens: {
    accessToken,
    refreshToken: "",
    accessExpiresAt: "2026-06-01T00:00:00.000Z",
    refreshExpiresAt: "2026-07-01T00:00:00.000Z",
  },
});

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const unauthorized = (): Response =>
  jsonResponse(
    {
      error: {
        code: "AUTH_UNAUTHORIZED",
        message: "Expired access token.",
      },
    },
    401,
  );

describe("api refresh handling", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("baydar.deviceId", "web-device");
    clearAccessToken(); // Clear in-memory token
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    clearAccessToken(); // Clear in-memory token after each test
  });

  it("refreshes the cookie session and retries apiFetch once after a 401", async () => {
    writeSession(makeSession("old-access"));
    const fetchMock = jest.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ data: makeSession("new-access") }))
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await expect(apiFetch("/profiles/me", OkPayload, { token: "old-access" })).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${apiBase}/auth/refresh`);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      deviceId: "web-device",
    });
    expect((fetchMock.mock.calls[2]?.[1]?.headers as Headers).get("Authorization")).toBe(
      "Bearer new-access",
    );
    expect(readSession()?.tokens.accessToken).toBe("new-access");
  });

  it("uses the refreshed session token for later calls even when caller has stale state", async () => {
    writeSession(makeSession("fresh-access"));
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse(undefined, 204));

    await expect(
      apiCall("/notifications/read-all", { method: "POST", token: "old-access" }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The test expects that the Authorization header uses the refreshed token from session
    // Even though we passed an old token in opts, the session token should be used.
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("Authorization")).toBe(
      "Bearer fresh-access",
    );
  });

  it("hydrates memory from a usable stored access token after a reload", async () => {
    window.localStorage.setItem("baydar.session.v1", JSON.stringify(makeSession("stored-access")));
    clearAccessToken();
    const fetchMock = jest.mocked(global.fetch);

    await expect(getValidAccessToken()).resolves.toBe("stored-access");

    expect(getAccessToken()).toBe("stored-access");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes apiFetchPage after a reload leaves only the blank stored access token", async () => {
    writeSession(makeSession("old-access"));
    clearAccessToken();
    const fetchMock = jest.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ data: makeSession("new-access") }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ ok: true }],
          meta: { nextCursor: null, hasMore: false },
        }),
      );

    await expect(apiFetchPage("/feed", OkPage)).resolves.toEqual({
      data: [{ ok: true }],
      meta: { nextCursor: null, hasMore: false },
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("Authorization")).toBeNull();
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${apiBase}/auth/refresh`);
    expect((fetchMock.mock.calls[2]?.[1]?.headers as Headers).get("Authorization")).toBe(
      "Bearer new-access",
    );
  });

  it("refreshes apiCall once after a 401 and retries the mutation", async () => {
    writeSession(makeSession("old-access"));
    const fetchMock = jest.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ data: makeSession("new-access") }))
      .mockResolvedValueOnce(jsonResponse(undefined, 204));

    await expect(
      apiCall("/notifications/read-all", { method: "POST", token: "old-access" }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[2]?.[1]?.headers as Headers).get("Authorization")).toBe(
      "Bearer new-access",
    );
  });

  it("does not refresh more than once when the retried request is still unauthorized", async () => {
    writeSession(makeSession("old-access"));
    const fetchMock = jest.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ data: makeSession("new-access") }))
      .mockResolvedValueOnce(unauthorized());

    await expect(
      apiFetch("/profiles/me", OkPayload, { token: "old-access" }),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTH_UNAUTHORIZED",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("queues concurrent 401 refreshes behind one refresh request", async () => {
    writeSession(makeSession("old-access"));
    const fetchMock = jest.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ data: makeSession("new-access") }))
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }))
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await expect(
      Promise.all([
        apiFetch("/profiles/me", OkPayload, { token: "old-access" }),
        apiFetch("/profiles/me", OkPayload, { token: "old-access" }),
      ]),
    ).resolves.toEqual([{ ok: true }, { ok: true }]);

    const refreshCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === `${apiBase}/auth/refresh`,
    );
    expect(refreshCalls).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("clears the stored session when refresh fails", async () => {
    writeSession(makeSession("old-access"));
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized());

    await expect(
      apiFetch("/profiles/me", OkPayload, { token: "old-access" }),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTH_UNAUTHORIZED",
    });

    expect(readSession()).toBeNull();
  });
});
