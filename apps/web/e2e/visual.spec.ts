import { expect, test, type APIRequestContext, type Page, type Route } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

// Every authenticated route that renders without an id from the database.
// This was 7 routes against a 46-route matrix, which is not coverage, it is a
// sample. Detail routes (`/jobs/[id]`, `/employer/[slug]/…`) stay out because
// they need ids the harness resolves at runtime; `shots.mjs` covers those.
const ROUTES = [
  "feed",
  "search",
  "network",
  "notifications",
  "messages",
  "messages/new",
  "saved",
  "activity",
  "jobs",
  "me",
  "me/edit",
  "me/connections",
  "me/premium",
  "me/karama",
  "cv",
  "employer",
  "settings",
  "settings/appearance",
  "settings/account",
  "settings/privacy",
  "settings/notifications",
  "settings/security",
  "settings/blocked",
] as const;
const LOCALES = ["ar-PS", "en"] as const;
const VIEWPORTS = [
  { name: "desktop", size: { width: 1440, height: 900 } },
  { name: "mobile", size: { width: 390, height: 844 } },
] as const;

test.describe("visual route coverage", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, request }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-ar",
      "The visual matrix covers ar-PS/en and desktop/mobile in one project.",
    );
    await installAuth(page, request);
  });

  for (const locale of LOCALES) {
    for (const viewport of VIEWPORTS) {
      test(`${locale} ${viewport.name} app surfaces render`, async ({ page }) => {
        // 23 routes in one test, each with a navigation and a settle, does not
        // fit the 60s default. Kept as one test rather than 92 separate ones:
        // the per-route assertions all name their route, and 92 tests would
        // each pay browser-context setup for one page load.
        test.setTimeout(240_000);
        await page.setViewportSize(viewport.size);
        for (const route of ROUTES) {
          await assertVisualRoute(page, `/${locale}/${route}`, viewport.name === "mobile");
        }
      });
    }
  }

  // The four states the seeded happy path never reaches. Pixel snapshots are
  // deliberately kept to one surface each rather than the whole matrix: a
  // snapshot is a maintenance tax paid on every legitimate design change, and
  // these four exist to catch a state losing its illustration or its copy
  // wholesale — not to police layout. `shots.mjs --state=` sweeps all of them
  // across every route when a human is actually looking.
  for (const [state, install] of [
    ["empty", emptyLists],
    ["error", failGet],
    ["offline", goOffline],
  ] as const) {
    test(`feed ${state} state matches mobile snapshot`, async ({ page }) => {
      await install(page, "**/api/v1/**");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/ar-PS/feed", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1_200);
      if (!process.env.CI) {
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      }
      // `main`, not the full page, and the header masked. The QA fixture user
      // is minted per run (`qa+<runId>.a11y@…`), so their name and avatar
      // initials differ every time — a full-page snapshot of the app shell
      // diffs on the username and reports a design regression that is really
      // a fixture id. These three exist to catch a state losing its
      // illustration or its copy, which lives in `main`.
      await expect(page.locator("main").first()).toHaveScreenshot(`feed-${state}-ar-mobile.png`, {
        animations: "disabled",
        mask: [page.locator("header")],
        maxDiffPixelRatio: 0.02,
      });
      // The empty-state handler proxies through `route.fetch()`, and the feed
      // keeps polling — a request still in flight when the page closes throws
      // "Target page has been closed" out of the route callback and fails a
      // test whose assertion already passed.
      await page.unrouteAll({ behavior: "ignoreErrors" });
    });
  }

  test("activity error state matches mobile snapshot", async ({ page }) => {
    await failGet(page, "**/api/v1/profiles/me");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/activity", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Activity is unavailable")).toBeVisible();
    if (!process.env.CI) {
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    }
    await expect(page).toHaveScreenshot("activity-error-en-mobile.png", {
      animations: "disabled",
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

async function installAuth(page: Page, request: APIRequestContext): Promise<void> {
  const auth = await ensureA11yStorageState(request);
  await page.addInitScript((state) => {
    window.localStorage.setItem("baydar.session.v1", state.session);
    window.localStorage.setItem("baydar.deviceId", state.deviceId);
  }, auth);
}

async function assertVisualRoute(page: Page, route: string, checkOverflow: boolean): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(700);

  const body = page.locator("body");
  await expect(body).toBeVisible();
  await expect(body).not.toContainText(/Application error|Unhandled Runtime Error/i);
  await expect(body).not.toContainText(/TypeError|ReferenceError|SyntaxError/);

  // Horizontal overflow at 390px used to be measured only when someone ran the
  // screenshot matrix by hand, and it is invisible in the screenshot anyway —
  // the image just grows to fit. Riding the navigation that already happened
  // makes it a gate for free. MUST run before the fullPage screenshot below:
  // `fullPage` resizes the viewport internally, and measuring afterwards reads
  // the resized layout (that is how /me/edit was once reported as 526px wide
  // in a 390px viewport when it was in fact clean).
  if (checkOverflow) {
    const overflow = await measureOverflow(page);
    expect(
      overflow,
      `${route} overflows horizontally at 390px: ${JSON.stringify(overflow)}`,
    ).toBeNull();
  }

  const screenshot = await page.screenshot({ animations: "disabled", fullPage: true });
  expect(screenshot.byteLength, `${route} screenshot should not be blank`).toBeGreaterThan(8_000);
}

async function measureOverflow(
  page: Page,
): Promise<{ scrollWidth: number; clientWidth: number; guilty: string[] } | null> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    if (doc.scrollWidth <= doc.clientWidth) return null;
    // RTL overflows to the LEFT (negative x), LTR to the right. A detector
    // that only checks `right > clientWidth` finds nothing on an Arabic page
    // and calls every RTL screen clean. Elements a scrolling ancestor already
    // clips (the nav is `overflow-x-auto` by design) sit outside the viewport
    // without widening the document, so skip them.
    const clipped = (el: Element): boolean => {
      for (let p = el.parentElement; p && p !== doc; p = p.parentElement) {
        if (/auto|scroll|hidden/.test(getComputedStyle(p).overflowX)) return true;
      }
      return false;
    };
    const guilty = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.left >= -1 && r.right <= doc.clientWidth + 1) return false;
        return !clipped(el);
      })
      .slice(0, 5)
      .map((el) =>
        `${el.tagName.toLowerCase()}.${el.getAttribute("class") || "(no class)"}`.slice(0, 120),
      );
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, guilty };
  });
}

async function failGet(page: Page, pattern: string): Promise<void> {
  await page.route(pattern, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await failRoute(route);
  });
}

async function failRoute(route: Route): Promise<void> {
  await route.fulfill({
    contentType: "application/json",
    status: 500,
    body: JSON.stringify({ error: { code: "INTERNAL", message: "Forced QA failure" } }),
  });
}

/** Every list comes back with zero rows, envelope shape preserved. */
async function emptyLists(page: Page, pattern: string): Promise<void> {
  await page.route(pattern, async (route) => {
    if (route.request().method() !== "GET" || route.request().url().includes("/auth/")) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const text = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      await route.fulfill({ response });
      return;
    }
    await route.fulfill({
      response,
      contentType: "application/json",
      body: JSON.stringify(emptied(json)),
    });
  });
}

function emptied(value: unknown): unknown {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => {
        if (Array.isArray(v)) return [k, []];
        if (v && typeof v === "object") return [k, emptied(v)];
        if (k === "hasMore") return [k, false];
        if (k === "nextCursor") return [k, null];
        if (/count$/i.test(k) && typeof v === "number") return [k, 0];
        return [k, v];
      }),
    );
  }
  return value;
}

/** The network is gone: the app must show its offline surface, not a spinner. */
async function goOffline(page: Page, pattern: string): Promise<void> {
  await page.route(pattern, async (route) => {
    if (route.request().url().includes("/auth/")) {
      await route.continue();
      return;
    }
    await route.abort("internetdisconnected");
  });
}
