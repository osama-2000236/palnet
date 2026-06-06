import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

const ROUTES = ["feed", "search", "network", "notifications", "messages", "settings", "activity"] as const;
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
