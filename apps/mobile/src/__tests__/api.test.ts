import { z } from "zod";

import { apiFetch, signOut } from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/session";

const mockFetch = jest.fn();

jest.mock("@/lib/session", () => ({
  clearSession: jest.fn(),
  getAccessToken: jest.fn(async () => null),
  getDeviceId: jest.fn(async () => "test-device"),
  readSession: jest.fn(async () => null),
  writeSession: jest.fn(),
}));

describe("mobile api client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as never;
    jest.spyOn(Date, "now").mockReturnValue(1779300000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("disables response caching so Android receives schema-valid JSON bodies", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { ok: true } }),
    });

    await expect(apiFetch("/health", z.object({ ok: z.literal(true) }))).resolves.toEqual({
      ok: true,
    });

    expect(mockFetch.mock.calls[0]?.[0]).toEqual(
      expect.stringMatching(/\/api\/v1\/health\?_=1779300000000$/),
    );

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.cache).toBe("no-store");

    const headers = init?.headers as Headers;
    expect(headers.get("Cache-Control")).toBe("no-store");
    expect(headers.get("Pragma")).toBe("no-cache");
    expect(headers.has("If-None-Match")).toBe(false);
    expect(headers.has("If-Modified-Since")).toBe(false);
  });

  it("revokes this device's refresh token on sign-out before clearing the session", async () => {
    jest.mocked(getAccessToken).mockResolvedValueOnce("access");
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });

    await signOut();

    expect(mockFetch.mock.calls[0]?.[0]).toEqual(expect.stringContaining("/api/v1/auth/logout"));
    expect(JSON.parse(String((mockFetch.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      deviceId: "test-device",
    });
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("still clears the session when the revoke call fails", async () => {
    jest.mocked(getAccessToken).mockResolvedValueOnce("access");
    mockFetch.mockRejectedValue(new TypeError("offline"));

    await expect(signOut()).resolves.toBeUndefined();

    expect(clearSession).toHaveBeenCalledTimes(1);
  });
});
