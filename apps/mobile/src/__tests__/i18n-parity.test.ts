import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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

/**
 * i18next spells a plural as one key per category, and the categories differ by
 * language: Arabic takes all six, English two. Comparing the raw key sets would
 * therefore report 54 keys "missing in en" for a correctly pluralised catalog,
 * and the consumed-key check would report every `t("feed.round.count")` as
 * undefined because only `…count_one`, `…count_other` and friends exist.
 * Fold the suffix and compare the message, not the spelling.
 */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const foldPlurals = (keys: string[]): string[] => keys.map((key) => key.replace(PLURAL_SUFFIX, ""));

const ROOTS = [join(__dirname, ".."), join(__dirname, "..", "..", "app")];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === "__tests__" || entry === "node_modules" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

// i18next takes the full dotted path, so a plain t("a.b.c") is checkable as-is.
// Template keys (t(`a.${b}`)) are skipped — nothing static to resolve.
function consumedKeys(file: string): string[] {
  return [...readFileSync(file, "utf8").matchAll(/\bt\(\s*"([a-zA-Z][\w.]*)"/g)].map((m) => m[1]);
}

describe("mobile i18n catalogs", () => {
  it("ar and en expose the exact same key set", () => {
    const arKeys = new Set(foldPlurals(flattenKeys(ar)));
    const enKeys = new Set(foldPlurals(flattenKeys(en)));
    const missingInAr = [...enKeys].filter((key) => !arKeys.has(key));
    const missingInEn = [...arKeys].filter((key) => !enKeys.has(key));
    expect({ missingInAr, missingInEn }).toEqual({ missingInAr: [], missingInEn: [] });
  });

  // Key-set parity compares the catalogs against each other, so a key missing
  // from BOTH stays invisible to it — which is exactly how the web app shipped
  // messaging.connectionLost absent everywhere. Check what the code asks for.
  it("every key the code asks for exists in the catalog", () => {
    const defined = new Set(foldPlurals(flattenKeys(ar)));
    const missing = [
      ...new Set(ROOTS.flatMap((root) => sourceFiles(root)).flatMap((f) => consumedKeys(f))),
    ]
      .filter((key) => !defined.has(key))
      .sort();
    expect(missing).toEqual([]);
  });
});
