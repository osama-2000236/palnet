import { z } from "zod";

import { apiFetch } from "@/lib/api";

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
});
