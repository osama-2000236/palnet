/**
 * Exactly one module may write React Native's layout direction.
 *
 * `I18nManager.forceRTL` sets a PROCESS-GLOBAL flag that only takes effect on
 * the next launch, and `I18nManager.isRTL` is a snapshot taken once at module
 * init — so a second writer cannot see what the first one did this launch.
 *
 * That is the bug this test exists for. `apps/mobile/app/_layout.tsx` used to
 * run `if (!I18nManager.isRTL) { forceRTL(true) }` at module scope, after
 * `src/i18n` had already applied the user's locale. Switching the app to
 * English wrote `forceRTL(false)`; on the next launch `isRTL` read false, the
 * `_layout` block forced it back to true, and the app flip-flopped direction
 * every launch, forever. It survived one round of "fixed" because the earlier
 * fix addressed a different cause and left the second writer in place.
 *
 * Arabic-first does not depend on that block: `getInitialLocale()` falls back
 * to `EXPO_PUBLIC_DEFAULT_LOCALE` (ar-PS), so the default is preserved.
 *
 * Run with: node --test scripts/__tests__/rtl-direction-writer.test.mjs
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));

/** The one module allowed to call it — `applyLocaleDirection()` lives here. */
const OWNER = "apps/mobile/src/lib/locale.ts";

/** Native source trees where an I18nManager call would actually run. */
const TREES = ["apps/mobile/app", "apps/mobile/src", "packages/ui-native/src"];

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function callersOf(pattern) {
  const hits = [];
  for (const tree of TREES) {
    for (const file of sourceFiles(join(root, tree))) {
      if (pattern.test(readFileSync(file, "utf8"))) {
        hits.push(relative(root, file).replace(/\\/g, "/"));
      }
    }
  }
  return hits.sort();
}

test("only locale.ts writes the layout direction", () => {
  assert.deepEqual(callersOf(/I18nManager\.forceRTL\s*\(/), [OWNER]);
  assert.deepEqual(callersOf(/I18nManager\.allowRTL\s*\(/), [OWNER]);
});

test("locale.ts really is the writer — the test cannot pass by finding nothing", () => {
  const owner = readFileSync(join(root, OWNER), "utf8");
  assert.match(owner, /export function applyLocaleDirection/);
  assert.match(owner, /I18nManager\.forceRTL\(isRtl\)/);
});
