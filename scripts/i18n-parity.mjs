import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = process.cwd();

const groups = [
  {
    name: "web",
    base: "apps/web/messages/en.json",
    targets: ["apps/web/messages/ar.json", "apps/web/messages/ar-PS.json"],
  },
  {
    name: "mobile",
    base: "apps/mobile/src/i18n/en.json",
    targets: ["apps/mobile/src/i18n/ar.json"],
  },
];

let failed = false;

for (const group of groups) {
  const basePath = resolve(root, group.base);
  const baseKeys = keys(await readJson(basePath));

  for (const target of group.targets) {
    const targetPath = resolve(root, target);
    const targetKeys = keys(await readJson(targetPath));
    const missing = [...baseKeys].filter((key) => !targetKeys.has(key)).sort();
    const extra = [...targetKeys].filter((key) => !baseKeys.has(key)).sort();

    if (missing.length === 0 && extra.length === 0) continue;

    failed = true;
    console.error(`\n[i18n-parity] ${group.name}: ${relative(root, target)}`);
    if (missing.length > 0) {
      console.error("  missing:");
      for (const key of missing) console.error(`    - ${key}`);
    }
    if (extra.length > 0) {
      console.error("  extra:");
      for (const key of extra) console.error(`    - ${key}`);
    }
  }
}

if (failed) process.exit(1);
console.log("[i18n-parity] ok");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function keys(value, prefix = "") {
  const out = new Set();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === "object" && !Array.isArray(child)) {
        for (const nested of keys(child, next)) out.add(nested);
      } else {
        out.add(next);
      }
    }
    return out;
  }
  if (prefix) out.add(prefix);
  return out;
}
