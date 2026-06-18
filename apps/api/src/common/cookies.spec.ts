import {
  parseCookieHeader,
  serializeClearedRefreshCookie,
  serializeRefreshCookie,
} from "./cookies";

describe("refresh cookie helpers", () => {
  it("uses SameSite=None for secure cross-site deploy cookies", () => {
    expect(serializeRefreshCookie("refresh-token", { secure: true })).toContain("SameSite=None");
    expect(serializeRefreshCookie("refresh-token", { secure: true })).toContain("Secure");
  });

  it("keeps local insecure cookies as SameSite=Lax", () => {
    const cookie = serializeRefreshCookie("refresh-token", { secure: false });

    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("clears refresh cookie with the same secure cross-site attributes", () => {
    const cookie = serializeClearedRefreshCookie({ secure: true });

    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Secure");
  });

  it("parses encoded cookie values", () => {
    expect(parseCookieHeader("foo=bar; baydar_refresh=a%2Bb%2Fc", "baydar_refresh")).toBe("a+b/c");
  });
});
