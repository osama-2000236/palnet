import { formatUserAgent } from "./user-agent";

describe("formatUserAgent", () => {
  // The order of the browser checks IS the logic: every browser lies about
  // being every other one. Each of these strings is a real UA that would be
  // misattributed by a naive `includes("Chrome")`.
  it.each([
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "Chrome · Windows",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
      "Edge · Windows",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Safari · macOS",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1",
      "Chrome · iOS",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Chrome · Android",
    ],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0", "Firefox · Linux"],
    [
      "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
      "Samsung Internet · Android",
    ],
  ])("reads %s as %s", (ua, expected) => {
    expect(formatUserAgent(ua)).toBe(expected);
  });

  it("returns null rather than a half-parsed string, so callers can fall back", () => {
    expect(formatUserAgent(null)).toBeNull();
    expect(formatUserAgent("")).toBeNull();
    expect(formatUserAgent("   ")).toBeNull();
    expect(formatUserAgent("curl/8.4.0")).toBeNull();
  });

  it("reports whichever half it recognises", () => {
    expect(formatUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows");
  });
});
