import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = [
  path.join(root, "apps/mobile/app"),
  path.join(root, "packages/ui-native/src"),
];
const extensions = new Set([".ts", ".tsx"]);

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function localNamesFromImport(clause) {
  const names = [];
  const named = clause.match(/\{([\s\S]*?)\}/);
  if (!named) return names;

  for (const rawPart of named[1].split(",")) {
    const part = rawPart.trim().replace(/^type\s+/, "");
    if (!part) continue;
    const alias = part.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
    names.push(alias?.[1] ?? part.split(/\s+/)[0]);
  }
  return names;
}

const failures = [];
for (const file of scanRoots.flatMap(listFiles)) {
  const source = fs.readFileSync(file, "utf8");
  const seen = new Map();
  const importPattern = /import\s+(?!type\b)([\s\S]*?)\s+from\s+["'][^"']+["'];?/g;
  let match;
  while ((match = importPattern.exec(source))) {
    for (const name of localNamesFromImport(match[1])) {
      if (!seen.has(name)) {
        seen.set(name, match.index);
        continue;
      }
      failures.push(`${path.relative(root, file)} imports local name "${name}" more than once`);
    }
  }
}

if (failures.length > 0) {
  console.error("Duplicate named imports found:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Duplicate named import scan clean.");
