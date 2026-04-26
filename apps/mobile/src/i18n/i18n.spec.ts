import ar from "./ar.json";
import en from "./en.json";

function keysOf(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("mobile i18n resources", () => {
  it("keeps Arabic as the complete fallback resource", () => {
    const arKeys = new Set(keysOf(ar));
    const missing = keysOf(en).filter((key) => !arKeys.has(key));

    expect(missing).toEqual([]);
  });

  it("uses Arabic product copy in the default resource", () => {
    expect(ar.common.appName).toBe("بيدر");
    expect(ar.landing.title).toContain("بيدر");
  });
});
