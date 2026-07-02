import ar from "../i18n/ar.json";
import en from "../i18n/en.json";

// Arabic is the default locale; every key must exist in both catalogs so no
// screen silently falls back or renders a raw key in either language.
function flattenKeys(node: unknown, prefix = ""): string[] {
  if (node === null || typeof node !== "object") return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("mobile i18n catalogs", () => {
  it("ar and en expose the exact same key set", () => {
    const arKeys = new Set(flattenKeys(ar));
    const enKeys = new Set(flattenKeys(en));
    const missingInAr = [...enKeys].filter((key) => !arKeys.has(key));
    const missingInEn = [...arKeys].filter((key) => !enKeys.has(key));
    expect({ missingInAr, missingInEn }).toEqual({ missingInAr: [], missingInEn: [] });
  });
});
