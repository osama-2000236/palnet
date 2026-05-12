// Captures Expo Web mobile-route proxies at iPhone/Pixel viewport approximations.
// Runs against a running Expo Web server (default http://localhost:8081).
//
// Run:
//   node scripts/capture-mobile-snapshots.mjs
//
// Requires:
//   corepack pnpm --filter @baydar/api dev
//   corepack pnpm --filter @baydar/mobile web

import { chromium } from "playwright";
import { mkdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const OUT = "design-handoff-2026-05/04-screens";
const BASE_URL = process.env.EXPO_WEB_URL ?? "http://localhost:8081";
const AUTH_STATE = "apps/web/tests/.auth/storageState.json";

const DEVICES = [
  { name: "iphone15", width: 393, height: 852, scale: 3 },
  { name: "pixel7", width: 412, height: 915, scale: 2.625 },
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

async function readAuthEntries() {
  try {
    const state = JSON.parse(await readFile(AUTH_STATE, "utf8"));
    return {
      cookies: state.cookies ?? [],
      localStorage: (state.origins ?? []).flatMap((origin) => origin.localStorage ?? []),
    };
  } catch {
    console.warn("auth state not found; authed routes may redirect to /login");
    return { cookies: [], localStorage: [] };
  }
}

async function loadAuth(context, auth) {
  if (auth.cookies.length > 0) {
    await context.addCookies(
      auth.cookies.map((cookie) => ({
        ...cookie,
        url: cookie.url ?? BASE_URL,
      })),
    );
  }

  if (auth.localStorage.length > 0) {
    await context.addInitScript((entries) => {
      for (const entry of entries) {
        window.localStorage.setItem(entry.name, entry.value);
      }
    }, auth.localStorage);
  }
}

const browser = await chromium.launch();
const auth = await readAuthEntries();
let captured = 0;
let failed = 0;
let tooSmall = 0;

for (const device of DEVICES) {
  for (const locale of LOCALES) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
      isMobile: true,
      hasTouch: true,
      locale,
      extraHTTPHeaders: {
        "Accept-Language": locale === "ar-PS" ? "ar-PS,ar;q=0.9,en;q=0.7" : "en,ar;q=0.7",
      },
    });
    await loadAuth(context, auth);
    const page = await context.newPage();

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      const dir = join(OUT, route.screen, "mobile");
      const file = join(dir, `expo-web-${device.name}-${locale}.png`);
      await mkdir(dir, { recursive: true });

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1500);
        await page.screenshot({ path: file, fullPage: true, timeout: 30000 });

        const info = await stat(file);
        if (info.size < 8 * 1024) {
          tooSmall++;
          console.warn(`SMALL ${file}: ${info.size} bytes`);
        }
        captured++;
      } catch (error) {
        failed++;
        console.error(`FAIL ${url}: ${error.message}`);
      }
    }

    await context.close();
  }
}

await browser.close();
console.log(`done: captured=${captured} failed=${failed} tooSmall=${tooSmall}`);
