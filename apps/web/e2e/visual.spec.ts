import { expect, test, type APIRequestContext, type Page, type Route } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

const ROUTES = [
  "feed",
  "search",
  "network",
  "notifications",
  "messages",
  "settings",
  "activity",
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
        await page.setViewportSize(viewport.size);
        for (const route of ROUTES) {
          await assertVisualRoute(page, `/${locale}/${route}`);
        }
      });
    }
  }

  test("activity error state matches mobile snapshot", async ({ page }) => {
    await failGet(page, "**/api/v1/profiles/me");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/activity", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Activity is unavailable")).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
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

async function assertVisualRoute(page: Page, route: string): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(700);

  const body = page.locator("body");
  await expect(body).toBeVisible();
  await expect(body).not.toContainText(/Application error|Unhandled Runtime Error/i);
  await expect(body).not.toContainText(/TypeError|ReferenceError|SyntaxError/);

  const screenshot = await page.screenshot({ animations: "disabled", fullPage: true });
  expect(screenshot.byteLength, `${route} screenshot should not be blank`).toBeGreaterThan(8_000);
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
