import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const requireContext = require("expo-router/build/testing-library/require-context-ponyfill").default;
const { EXPO_ROUTER_CTX_IGNORE } = require("expo-router/_ctx-shared");
const { getTypedRoutesDeclarationFile } = require("expo-router/build/typed-routes/generate");

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const appRoot = resolve(repoRoot, "apps/mobile/app");
const outputFile = resolve(repoRoot, "apps/mobile/.expo/types/router.d.ts");

const ctx = requireContext(appRoot, true, EXPO_ROUTER_CTX_IGNORE);

if (ctx.keys().length === 0) {
  console.error("No Expo Router files found under apps/mobile/app.");
  process.exit(1);
}

const declaration = getTypedRoutesDeclarationFile(ctx);

if (declaration.includes(".next") || declaration.includes("/../")) {
  console.error("Generated Expo Router types include files outside apps/mobile/app.");
  process.exit(1);
}

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, declaration);

console.log(`Generated Expo Router types from ${ctx.keys().length} mobile route files.`);
