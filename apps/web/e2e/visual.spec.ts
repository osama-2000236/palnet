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
        //
        // 480s, not 240s: this takes ~2min alone, but it is the fourth of four
        // such tests in a serial suite and the last one runs against a `next
        // dev` server that has been cold-compiling routes for five minutes.
        // 240s left no margin and flaked exactly there. CI is prebuilt with
        // `next start` and never came close, which is why it only bit locally.
        test.setTimeout(480_000);
        await page.setViewportSize(viewport.size);
        for (const route of ROUTES) {
          await assertVisualRoute(page, `/${locale}/${route}`, viewport.name === "mobile");
        }
      });
    }
  }

  // Empty and error asserted by content, not by pixels.
  //
  // These were full-region snapshots and they failed three times for three
  // different reasons, none of them a design regression: a per-run fixture
  // username, then a missing Linux baseline, then the profile-completion
  // meter moving because an earlier spec in the same run edited the fixture
  // user. Each fix masked one more volatile region. That is the instrument
  // being wrong — a pixel snapshot of a page rendering live data cannot be
  // stable, and every false failure spends someone's afternoon.
  //
  // What these tests are actually for is "the state lost its illustration or
  // its copy wholesale", which is a content assertion. It is stable, it needs
  // no per-platform baselines, and it says what broke instead of showing a
  // diff. `shots.mjs --state=` still sweeps every route for a human.
  test("feed empty state keeps its title and recovery copy", async ({ page }) => {
    await emptyLists(page, "**/api/v1/**");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ar-PS/feed", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_200);

    // Title and body, not the illustration: `main` is full of small
    // `aria-hidden` icons, so "the first svg" is not a hook for the motif, and
    // adding a test id to app code buys less than these two lines already do.
    const main = page.locator("main").first();
    await expect(main.getByText("لا يوجد شيء في خلاصتك بعد")).toBeVisible();
    await expect(main.getByText(/ابدأ بنشر أول منشور لك/)).toBeVisible();
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("feed error state offers a retry, not a dead end", async ({ page }) => {
    await failGet(page, "**/api/v1/**");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ar-PS/feed", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_200);

    const main = page.locator("main").first();
    await expect(main.getByText("الخلاصة غير متاحة الآن")).toBeVisible();
    await expect(main.getByRole("button", { name: /إعادة تحميل/ })).toBeVisible();
  });

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

  // Render check by CONTENT, not by PNG size.
  //
  // This was `screenshot.byteLength > 8_000`, a proxy for "did it render" that
  // is really a function of how compressible the page is. Measured across all
  // 20 mobile routes, every one sits 2–7× above that line except `/cv` — a
  // print-optimised resume that is mostly white — which came in at 10,670.
  // 33% of headroom, and it tripped the threshold on one run and cleared it on
  // the next. A check that fails intermittently is worse than no check,
  // because it teaches people to re-run instead of to look.
  //
  // Same lesson round 2's pixel snapshots taught: prefer a content assertion
  // for anything rendering live data.
  const rendered = await page.evaluate(() => ({
    chars: (document.body.innerText ?? "").trim().length,
    // Whole document, not `main *`: not every route renders a <main>
    // (/me/edit does not), and "did it render" is a question about the page.
    //
    // Elements the page PUT ON SCREEN. A bare `*` also counts the <script>
    // tags the framework injects into <body> — 10 of them in the served
    // /ar-PS/cv document — so a third of this number was a function of how the
    // bundler splits chunks rather than of what rendered. That is what the
    // Next 16 bump exposed: `/cv` cleared the floor below on Next 15 and
    // landed on exactly 30 under Turbopack, with a trace snapshot showing the
    // page fully rendered — name, headline, contact line, experience section.
    // The count has to be of the page, not of the build.
    elements: document.body.querySelectorAll(
      "*:not(script):not(template):not(style):not(link):not(noscript)",
    ).length,
  }));

  // `/me` is a redirect stub, not a screen: it resolves the handle and replaces
  // to `/in/<handle>`, rendering one "جارِ التحميل…" line while it does. The
  // round-2 rubric excluded it from scoring for the same reason. Asserting it
  // has a screen's worth of content would be asserting the wrong thing — but
  // it must still render *something*, or the redirect itself is broken.
  // Structure, not text volume. How much *text* a route renders is a function
  // of the fixture user's data — `/cv` is 26 characters for a profile with no
  // experience, and that is the page working as designed ("empty sections
  // hidden honestly", per the round-2 rubric). Tuning a character threshold
  // until `/cv` squeaks past is how round 2's pixel snapshots died: each fix
  // masked one more volatile region.
  //
  // Element count is data-independent. A page that failed to render has a
  // handful; a page that rendered has dozens.
  //
  // 12, not 30: 30 was set when the count still included the <script> tags
  // above. `/cv` — the smallest screen here, a print resume for a profile with
  // one job — puts 20 elements on screen, and its unrendered state is the
  // `<main role="status" aria-busy>` loading shell it server-renders: 4.
  // Nothing sits between those two that this number needs to split.
  //
  // `/me` is exempt from the element floor: it is a redirect stub, not a
  // screen — it resolves the handle and replaces to `/in/<handle>`, and the
  // rubric excluded it from scoring for the same reason. It must still put
  // *something* on screen, or the redirect itself is broken.
  const isRedirectStub = /\/me$/.test(route);
  expect(rendered.chars, `${route} rendered no text at all`).toBeGreaterThan(0);
  if (!isRedirectStub) {
    expect(rendered.elements, `${route} rendered almost no elements`).toBeGreaterThan(12);
  }

  // Still taken: it forces a full paint, and it is what `--update-snapshots`
  // would diff if pixel baselines are ever reintroduced.
  await page.screenshot({ animations: "disabled", fullPage: true });
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
