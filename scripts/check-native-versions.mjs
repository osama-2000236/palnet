import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredSingle = ["react-native", "react-native-svg"];
const observed = new Map();

function addVersion(name, version, source) {
  if (!observed.has(name)) observed.set(name, new Map());
  const versions = observed.get(name);
  if (!versions.has(version)) versions.set(version, []);
  versions.get(version).push(source);
}

function readPackageJson(packageDir, source) {
  const file = path.join(packageDir, "package.json");
  if (!fs.existsSync(file)) return;
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  if (pkg.name && pkg.version) addVersion(pkg.name, pkg.version, source);
}

function scanNodeModules(base) {
  const nm = path.join(base, "node_modules");
  for (const name of [...requiredSingle, "react"]) {
    readPackageJson(path.join(nm, name), path.relative(root, path.join(nm, name)));
  }

  const pnpmStore = path.join(nm, ".pnpm");
  if (!fs.existsSync(pnpmStore)) return;
  for (const entry of fs.readdirSync(pnpmStore)) {
    for (const name of [...requiredSingle, "react"]) {
      const prefix = `${name}@`;
      if (!entry.startsWith(prefix)) continue;
      const version = entry.slice(prefix.length).split("_")[0];
      addVersion(name, version, path.relative(root, path.join(pnpmStore, entry)));
    }
  }
}

for (const base of [
  root,
  path.join(root, "apps/mobile"),
  path.join(root, "packages/ui-native"),
]) {
  scanNodeModules(base);
}

const failures = [];
for (const name of requiredSingle) {
  const versions = observed.get(name) ?? new Map();
  if (versions.size !== 1) {
    failures.push(`${name}: expected exactly one installed version, found ${[...versions.keys()].join(", ") || "none"}`);
  }
}

for (const [name, versions] of observed) {
  console.log(`${name}: ${[...versions.keys()].join(", ")}`);
}

if (failures.length > 0) {
  console.error("Native version drift found:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Native version drift scan clean.");
