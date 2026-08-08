// The three journeys, on Gaza's network.
//
// Gaza's mobile data is 2G: 20–40 kbit/s, with a round trip measured in
// hundreds of milliseconds rather than tens. Every budget, every mode and
// every cache in WS-11 exists because of those two numbers, and this is the
// only place they are actually applied rather than assumed.
//
// The thresholds below are not good numbers. They are the honest ones for
// 30 kbit/s, and having them measured is the point — a regression that pushes
// the feed from eight seconds to eighteen is invisible on a developer's
// laptop and unusable in Gaza.

import { expect, test, type CDPSession, type Page } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

/** 30 kbit/s down, 20 up, 400 ms round trip. The middle of §2.3's range. */
const TWO_G = {
  offline: false,
  downloadThroughput: (30 * 1024) / 8,
  uploadThroughput: (20 * 1024) / 8,
  latency: 400,
};

/** First contentful paint under 8s, interaction-ready under 12s. */
const FCP_BUDGET_MS = 8_000;
const READY_BUDGET_MS = 12_000;

async function throttle(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", TWO_G);
  return cdp;
}

/** Milliseconds from navigation start to first contentful paint. */
async function firstContentfulPaint(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const existing = performance
          .getEntriesByType("paint")
          .find((entry) => entry.name === "first-contentful-paint");
        if (existing) {
          resolve(existing.startTime);
          return;
        }
        new PerformanceObserver((list, observer) => {
          const paint = list.getEntries().find((entry) => entry.name === "first-contentful-paint");
          if (paint) {
            observer.disconnect();
            resolve(paint.startTime);
          }
        }).observe({ type: "paint", buffered: true });
      }),
  );
}

test.describe("2G journeys", () => {
  test.beforeEach(async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-ar", "Run once, in Arabic.");
    // Throttling makes every step slow by design; the default 60s is the
    // budget for one page, not for three of them.
    testInfo.setTimeout(180_000);

    const auth = await ensureA11yStorageState(request);
    await page.addInitScript((state) => {
      window.localStorage.setItem("baydar.session.v1", state.session);
      window.localStorage.setItem("baydar.deviceId", state.deviceId);
      // Force خفيف. Chrome does not report `effectiveType` under CDP
      // throttling, so without this the app detects `moderate` and the run
      // measures the wrong mode entirely.
      window.localStorage.setItem("baydar.bandwidth-mode", "light");
    }, auth);
  });

  for (const journey of [
    { name: "feed", path: "/ar-PS/feed" },
    { name: "jobs", path: "/ar-PS/jobs" },
    { name: "messages", path: "/ar-PS/messages" },
  ]) {
    test(`${journey.name} paints and becomes usable at 30 kbit/s`, async ({ page }, testInfo) => {
      await throttle(page);

      const started = Date.now();
      await page.goto(journey.path, { waitUntil: "commit" });

      const fcp = await firstContentfulPaint(page);
      await page.waitForLoadState("domcontentloaded");
      // Interaction-ready: the shell's own navigation is on screen and
      // clickable. Not `networkidle` — on 2G that waits for every image, and
      // in خفيف there are none to wait for.
      await expect(page.getByRole("navigation").first()).toBeVisible({
        timeout: READY_BUDGET_MS,
      });
      const ready = Date.now() - started;

      // Attached whether or not the budgets hold: a passing run that records
      // 7.9 seconds is the warning before the failing one.
      await testInfo.attach(`${journey.name}-2g-timings`, {
        body: JSON.stringify({ firstContentfulPaintMs: Math.round(fcp), readyMs: ready }, null, 2),
        contentType: "application/json",
      });

      expect(fcp, `first contentful paint on 2G (${Math.round(fcp)}ms)`).toBeLessThan(
        FCP_BUDGET_MS,
      );
      expect(ready, `interaction-ready on 2G (${ready}ms)`).toBeLessThan(READY_BUDGET_MS);
    });
  }

  test("light mode requests no images", async ({ page }) => {
    // The mode's central promise. An image that slips through costs more than
    // the rest of the page put together on this connection.
    const imageRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "image") imageRequests.push(request.url());
    });

    await throttle(page);
    await page.goto("/ar-PS/feed", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation").first()).toBeVisible({ timeout: READY_BUDGET_MS });

    expect(imageRequests, `خفيف requested ${imageRequests.length} image(s)`).toEqual([]);
  });

  test("the mode chip says which mode the member is in", async ({ page }) => {
    // A member on 2G whose feed looks sparse concludes the product is broken
    // unless something on screen says otherwise.
    await throttle(page);
    await page.goto("/ar-PS/feed", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("switch", { name: /وضع البيانات/ })).toBeVisible({
      timeout: READY_BUDGET_MS,
    });
  });
});
