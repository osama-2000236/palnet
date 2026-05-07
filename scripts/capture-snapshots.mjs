// Captures every route at 3 viewports x 2 locales.
// Runs against running web dev server (http://localhost:3000).
// Auth fixture must be seeded first by running playwright auth.spec at least once.
//
// Run:
//   node scripts/capture-snapshots.mjs
//
// Requires: pnpm --filter @baydar/api dev   AND   pnpm --filter @baydar/web dev
// running in separate terminals.

import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = "design-handoff-2026-05/04-screens";
const VIEWPORTS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "tablet", w: 1024, h: 768 },
  { name: "mobile", w: 375, h: 812 },
];
const LOCALES = ["ar-PS", "en"];
const ROUTES = [
  { screen: "feed", path: "/feed", authed: true },
  { screen: "jobs", path: "/jobs", authed: true },
  { screen: "messages", path: "/messages", authed: true },
  { screen: "network", path: "/network", authed: true },
  { screen: "notifications", path: "/notifications", authed: true },
  { screen: "search", path: "/search", authed: true },
  { screen: "onboarding", path: "/onboarding", authed: true },
  { screen: "settings", path: "/settings", authed: true },
  { screen: "auth-login", path: "/login", authed: false },
  { screen: "auth-register", path: "/register", authed: false },
];

async function loadAuth(context) {
  const path = "apps/web/tests/.auth/storageState.json";
  try {
    const raw = await readFile(path, "utf8");
    const state = JSON.parse(raw);
    await context.addCookies(state.cookies ?? []);
    for (const o of state.origins ?? []) {
      await context.addInitScript((entries) => {
        for (const e of entries) localStorage.setItem(e.name, e.value);
      }, o.localStorage ?? []);
    }
  } catch {
    console.warn("auth state not found; authed routes will redirect to /login");
  }
}

const browser = await chromium.launch();
let captured = 0;
let failed = 0;
for (const vp of VIEWPORTS) {
  for (const locale of LOCALES) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      locale,
    });
    await loadAuth(ctx);
    const page = await ctx.newPage();
    for (const r of ROUTES) {
      const url = `http://localhost:3000/${locale}${r.path}`;
      const dir = join(OUT, r.screen, "web");
      await mkdir(dir, { recursive: true });
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: join(dir, `${vp.name}-${locale}-default.png`),
          fullPage: true,
        });
        captured++;
      } catch (e) {
        failed++;
        console.error(`FAIL ${url}: ${e.message}`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`done: captured=${captured} failed=${failed}`);
