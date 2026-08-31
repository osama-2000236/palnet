// The status-bar style is chosen per route, so the list of band-less routes has
// to stay true as screens are added. This test does not trust the list — it
// reads the route files and derives the answer from which of them actually
// render an `<AppBand>`.
//
// Why it exists: the first version of the rule was `pathname.includes("/me")`,
// which swept in `/me/edit` and `/me/karama` — both band screens — and painted
// dark icons onto olive. Caught on a device, not by any test.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { BANDLESS_ROUTES } from "../lib/status-bar-routes";

const APP_ROOT = join(__dirname, "..", "..", "app");

/** Every route file under `(app)`, as the pathname expo-router reports for it. */
function routeFiles(dir: string, prefix = ""): { route: string; file: string }[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full, `${prefix}/${entry}`);
    if (!entry.endsWith(".tsx") || entry === "_layout.tsx") return [];
    const name = entry.replace(/\.tsx$/, "");
    // `index` collapses into its directory; `[param]` routes are never static
    // pathnames, so the status-bar rule can't match them by name anyway.
    const route = name === "index" ? prefix || "/" : `${prefix}/${name}`;
    return [{ route, file: full }];
  });
}

const MOBILE_SRC = join(__dirname, "..");

/**
 * Does this screen put a band on the page?
 *
 * Not just `<AppBand` in the route file: `/feed` renders `<FeedTopBar>`, which
 * is where its AppBand lives. So follow the screen's own `@/screens/...`
 * imports one level before concluding a route is bare.
 */
function rendersBand(file: string): boolean {
  const src = readFileSync(file, "utf8");
  if (src.includes("<AppBand")) return true;
  for (const [, spec] of src.matchAll(/from "@\/(screens\/[^"]+)"/g)) {
    for (const ext of [".tsx", ".ts"]) {
      const candidate = join(MOBILE_SRC, `${spec}${ext}`);
      try {
        if (readFileSync(candidate, "utf8").includes("<AppBand")) return true;
      } catch {
        /* not a file — next candidate */
      }
    }
  }
  return false;
}

// Every route the ROOT layout can be on: the (app) tabs, the (auth) stack, and
// the launch gate at app/index.tsx. The root owns the status bar for all of them.
const routes = [
  ...routeFiles(join(APP_ROOT, "(app)")),
  ...routeFiles(join(APP_ROOT, "(auth)")),
  { route: "/", file: join(APP_ROOT, "index.tsx") },
].filter((r) => !r.route.includes("["));

test("the route scan finds the screens it is supposed to check", () => {
  // Guard against a silently empty scan making every assertion below vacuous.
  expect(routes.length).toBeGreaterThan(10);
  expect(routes.map((r) => r.route)).toContain("/feed");
  expect(routes.map((r) => r.route)).toContain("/me");
  expect(routes.map((r) => r.route)).toContain("/login");
});

test("BANDLESS_ROUTES lists exactly the static routes with no AppBand", () => {
  const actual = routes
    .filter(({ file }) => !rendersBand(file))
    .map(({ route }) => route)
    .sort();

  expect([...BANDLESS_ROUTES].sort()).toEqual(actual);
});

test("no route is listed as band-less while rendering a band", () => {
  for (const { route, file } of routes) {
    if (!BANDLESS_ROUTES.has(route)) continue;
    expect(rendersBand(file)).toBe(false);
  }
});
