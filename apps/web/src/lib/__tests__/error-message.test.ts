import { ApiRequestError } from "../api";
import { getErrorCode, toErrorMessage } from "../error-message";

/**
 * Stub the `useTranslations("errors")` translator. Returns the key when no
 * mapping is found — mirrors next-intl's actual fallback behaviour, which the
 * mapper has to detect so it can fall back to "fallback".
 */
function makeT(table: Record<string, string>): (key: string) => string {
  return (key) => table[key] ?? key;
}

describe("toErrorMessage", () => {
  it("maps an ApiRequestError code to errors.{code}", () => {
    const t = makeT({ AUTH_UNAUTHORIZED: "Please sign in again." });
    const msg = toErrorMessage(new ApiRequestError(401, "AUTH_UNAUTHORIZED"), t);
    expect(msg).toBe("Please sign in again.");
  });

  it("falls back when the code has no translation", () => {
    const t = makeT({ fallback: "Something went wrong." });
    const msg = toErrorMessage(new ApiRequestError(500, "UNKNOWN_CODE"), t);
    expect(msg).toBe("Something went wrong.");
  });

  it("maps a fetch TypeError to errors.NETWORK", () => {
    const t = makeT({ NETWORK: "Network is unavailable." });
    const msg = toErrorMessage(new TypeError("fetch failed"), t);
    expect(msg).toBe("Network is unavailable.");
  });

  it("falls back when NETWORK translation is missing", () => {
    const t = makeT({ fallback: "Something went wrong." });
    const msg = toErrorMessage(new TypeError("fetch failed"), t);
    expect(msg).toBe("Something went wrong.");
  });

  it("falls back for unknown error shapes", () => {
    const t = makeT({ fallback: "Something went wrong." });
    expect(toErrorMessage(new Error("boom"), t)).toBe("Something went wrong.");
    expect(toErrorMessage("plain string", t)).toBe("Something went wrong.");
    expect(toErrorMessage(undefined, t)).toBe("Something went wrong.");
  });
});

describe("getErrorCode", () => {
  it("returns the ApiRequestError code", () => {
    expect(getErrorCode(new ApiRequestError(403, "AUTH_FORBIDDEN"))).toBe("AUTH_FORBIDDEN");
  });

  it("returns NETWORK for fetch TypeError", () => {
    expect(getErrorCode(new TypeError("fetch failed"))).toBe("NETWORK");
  });

  it("returns null for unknown error shapes", () => {
    expect(getErrorCode(new Error("boom"))).toBeNull();
    expect(getErrorCode(undefined)).toBeNull();
  });
});
