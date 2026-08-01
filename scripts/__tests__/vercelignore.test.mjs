/**
 * `.vercelignore` must ship every root script the Vercel build actually runs.
 *
 * It did not, for three days. `@baydar/ui-tokens`' build gained
 * `node ../../scripts/build-tokens.mjs`, `.vercelignore` still said `scripts`,
 * and every deploy since died on MODULE_NOT_FOUND. Nothing failed locally and
 * nothing failed in CI — only the deploy, which nobody was watching.
 *
 * Two ways to get this wrong, so both are asserted:
 *
 *   1. Forgetting the re-include when a built package starts calling a root
 *      script. That is the bug that happened.
 *   2. Writing `scripts` instead of `scripts/*`. Gitignore semantics never
 *      descend into an excluded directory, so the `!scripts/...` line below it
 *      is dead and the "fix" fails exactly like the original bug.
 *
 * Run with: node --test scripts/__tests__/vercelignore.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const ignoreLines = readFileSync(new URL(".vercelignore", root), "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

/** Packages and apps the Vercel build keeps — the `!packages/x` / `!apps/x` lines. */
function vercelWorkspaces() {
  return ignoreLines
    .filter((line) => /^!(packages|apps)\/[^/]+$/.test(line))
    .map((line) => line.slice(1));
}

/** Root scripts a workspace's package.json invokes, e.g. `../../scripts/build-tokens.mjs`. */
function requiredRootScripts(workspace) {
  let manifest;
  try {
    manifest = readFileSync(new URL(`${workspace}/package.json`, root), "utf8");
  } catch {
    return [];
  }
  const scripts = JSON.parse(manifest).scripts ?? {};
  const names = new Set();
  for (const command of Object.values(scripts)) {
    for (const [, name] of String(command).matchAll(/\.\.\/\.\.\/scripts\/([\w.-]+)/g)) {
      names.add(name);
    }
  }
  return [...names];
}

test("every root script the Vercel build runs is re-included", () => {
  const workspaces = vercelWorkspaces();
  assert.ok(workspaces.length > 0, ".vercelignore lists no kept workspaces — parser is wrong");

  for (const workspace of workspaces) {
    for (const name of requiredRootScripts(workspace)) {
      assert.ok(
        ignoreLines.includes(`!scripts/${name}`),
        `${workspace} runs scripts/${name}, but .vercelignore never re-includes it — ` +
          `the Vercel build will fail with MODULE_NOT_FOUND. Add "!scripts/${name}".`,
      );
    }
  }
});

test("scripts is excluded by contents, so the re-includes are reachable", () => {
  const reincludesAScript = ignoreLines.some((line) => line.startsWith("!scripts/"));
  if (!reincludesAScript) return; // nothing to keep reachable

  assert.ok(
    !ignoreLines.includes("scripts"),
    'bare "scripts" excludes the directory itself, so gitignore never descends into it and ' +
      'every "!scripts/..." line below is dead. Use "scripts/*".',
  );
  assert.ok(ignoreLines.includes("scripts/*"), 'expected "scripts/*" to exclude the contents');
});
