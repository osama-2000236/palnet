import { expect, test, type APIRequestContext, type Page, type Route } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

test.describe("sad-path UX coverage", () => {
  test.beforeEach(async ({ page, request }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-ar",
      "Sad-path matrix runs once; assertions use English copy for stability.",
    );
    await installAuth(page, request);
  });

  test("activity center shows failed API and retry affordance", async ({ page }) => {
    await failGet(page, "**/api/v1/profiles/me");
    await page.goto("/en/activity", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Activity", exact: true })).toBeVisible();
    await expect(page.getByText("Activity is unavailable")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("notifications shows failed API and retry affordance", async ({ page }) => {
    await failGet(page, "**/api/v1/notifications?**");
    await page.goto("/en/notifications", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Notifications are unavailable")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry notifications" })).toBeVisible();
  });

  test("network empty data renders empty state", async ({ page }) => {
    await page.route("**/api/v1/connections?filter=ACCEPTED", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({ data: [] }),
      });
    });
    await page.goto("/en/network", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Start building your network")).toBeVisible();
    await expect(page.getByText("People you connect with will appear here.")).toBeVisible();
  });

  test("offline banner announces connection loss", async ({ page }) => {
    await page.goto("/en/feed", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("main")).toBeVisible();

    await page.context().setOffline(true);
    try {
      await expect(page.getByTestId("connectivity-banner")).toBeVisible();
      await expect(
        page.getByText("You are offline. Changes may not save until the connection returns."),
      ).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }
  });

  test("keyboard focus lands on a visible token ring", async ({ page }) => {
    await page.goto("/en/activity", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Activity", exact: true })).toBeVisible();

    for (let index = 0; index < 8; index += 1) {
      await page.keyboard.press("Tab");
      const ring = await activeFocusRing(page);
      if (ring && ring !== "none") {
        expect(ring).toContain("rgb");
        return;
      }
    }
    throw new Error("No focus-visible element exposed var(--focus-ring) styling.");
  });
});

async function installAuth(page: Page, request: APIRequestContext): Promise<void> {
  const auth = await ensureA11yStorageState(request);
  await page.addInitScript((state) => {
    window.localStorage.setItem("baydar.session.v1", state.session);
    window.localStorage.setItem("baydar.deviceId", state.deviceId);
  }, auth);
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

async function activeFocusRing(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    const style = window.getComputedStyle(active);
    return style.boxShadow;
  });
}
