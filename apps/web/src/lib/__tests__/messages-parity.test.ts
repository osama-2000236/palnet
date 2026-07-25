import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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

const SRC = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === "__tests__" || entry === "node_modules" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/**
 * Every key a file could be asking for, as a list of candidate `namespace.key`
 * strings per call site. A call is satisfied if ANY candidate exists.
 *
 * Binds each `const t = useTranslations("ns")` / `await getTranslations("ns")`
 * to its variable, then collects that variable's `t("key")` calls. Dynamic keys
 * (`t(\`a.${b}\`)`) are skipped — they cannot be checked statically.
 *
 * A file often declares `const t` more than once, in sibling components with
 * different namespaces. Resolving that properly needs real scope analysis; the
 * union keeps the check honest about what it can prove instead of inventing 14
 * failures on a page that renders perfectly well.
 */
function consumedKeys(file: string): string[][] {
  const src = readFileSync(file, "utf8");
  const namespaces = new Map<string, string[]>();
  for (const m of src.matchAll(
    /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*"([^"]+)"\s*\)/g,
  )) {
    namespaces.set(m[1], [...(namespaces.get(m[1]) ?? []), m[2]]);
  }

  const calls: string[][] = [];
  for (const [variable, scopes] of namespaces) {
    // t("key") and t.rich("key"); the optional .rich is why this is not a
    // plain call match.
    const call = new RegExp(`\\b${variable}(?:\\.rich)?\\(\\s*"([^"]+)"`, "g");
    for (const m of src.matchAll(call)) calls.push(scopes.map((ns) => `${ns}.${m[1]}`));
  }
  return calls;
}

describe("web message catalogs", () => {
  it("ar-PS and en expose the exact same key set", () => {
    const arKeys = new Set(flattenKeys(arPS));
    const enKeys = new Set(flattenKeys(en));
    const missingInAr = [...enKeys].filter((key) => !arKeys.has(key));
    const missingInEn = [...arKeys].filter((key) => !enKeys.has(key));
    expect({ missingInAr, missingInEn }).toEqual({ missingInAr: [], missingInEn: [] });
  });

  // Key-set parity cannot catch a key missing from BOTH catalogs — it compares
  // the two against each other, not against what the code asks for. That is how
  // `messaging.connectionLost` and `messaging.connectionFailed` shipped absent
  // everywhere: the SSE error path rendered the raw key path in both languages
  // while this suite stayed green.
  it("every key the code asks for exists in the catalog", () => {
    const defined = new Set(flattenKeys(arPS));
    const missing = [
      ...new Set(
        sourceFiles(SRC)
          .flatMap((file) => consumedKeys(file))
          .filter((candidates) => !candidates.some((key) => defined.has(key)))
          .map((candidates) => candidates.join(" | ")),
      ),
    ].sort();
    expect(missing).toEqual([]);
  });
});
