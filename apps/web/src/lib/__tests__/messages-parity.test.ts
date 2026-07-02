import arPS from "../../../messages/ar-PS.json";
import en from "../../../messages/en.json";

// Arabic is the default locale; every key must exist in both catalogs so no
// surface silently falls back or renders a raw key in either language.
function flattenKeys(node: unknown, prefix = ""): string[] {
  if (node === null || typeof node !== "object") return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("web message catalogs", () => {
  it("ar-PS and en expose the exact same key set", () => {
    const arKeys = new Set(flattenKeys(arPS));
    const enKeys = new Set(flattenKeys(en));
    const missingInAr = [...enKeys].filter((key) => !arKeys.has(key));
    const missingInEn = [...arKeys].filter((key) => !enKeys.has(key));
    expect({ missingInAr, missingInEn }).toEqual({ missingInAr: [], missingInEn: [] });
  });
});
