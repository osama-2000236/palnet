// Growth-loop flows (PR #65): public job share page, job alerts, CV export.

import { expect, test } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

test.describe("growth flows", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-ar", "Growth flows run once, in Arabic.");
  });

  test("public job share page renders anonymously with OG metadata", async ({ page, request }) => {
    // Job discovery needs auth; the page visit below stays anonymous.
    const auth = await ensureA11yStorageState(request);
    const token = (JSON.parse(auth.session) as { tokens: { accessToken: string } }).tokens
      .accessToken;
    const jobs = await request.get(`${API_BASE}/jobs?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(!jobs.ok(), "API unavailable for seeded job discovery.");
    const jobId = ((await jobs.json()) as { data?: Array<{ id: string }> }).data?.[0]?.id;
    test.skip(!jobId, "No seeded job available.");

    // No auth init script: this is the WhatsApp-recipient path.
    await page.goto(`/ar-PS/j/${jobId}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: "سجّل الدخول للتقديم" })).toBeVisible();
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);

    // Junk id must 404, not 500.
    const res = await page.goto("/ar-PS/j/not-a-cuid");
    expect(res?.status()).toBe(404);
  });

  test.describe("authenticated", () => {
    test.beforeEach(async ({ page, request }) => {
      const auth = await ensureA11yStorageState(request);
      await page.addInitScript((state) => {
        window.localStorage.setItem("baydar.session.v1", state.session);
        window.localStorage.setItem("baydar.deviceId", state.deviceId);
      }, auth);
    });

    test("job alert: create from filters, then delete", async ({ page }) => {
      await page.goto("/ar-PS/jobs");
      const createButton = page.getByRole("button", { name: "أنشئ تنبيهًا لهذا البحث" });
      await expect(createButton).toBeDisabled();

      const query = `مطور-${Date.now()}`;
      await page.getByPlaceholder("مسمى، شركة، كلمة مفتاحية…").fill(query);
      await expect(createButton).toBeEnabled();
      await createButton.click();

      const alertRow = page.locator("li", { hasText: query });
      await expect(alertRow).toBeVisible();

      await alertRow.getByRole("button", { name: "حذف التنبيه" }).click();
      await expect(alertRow).toHaveCount(0);
    });

    test("CV export page renders the profile print view", async ({ page }) => {
      await page.goto("/ar-PS/cv");
      await expect(page.getByRole("button", { name: "طباعة / حفظ PDF" })).toBeVisible();
      await expect(page.locator("h1")).toContainText(/A11y/);
      await expect(page.locator("body")).not.toContainText(
        /Application error|Unhandled Runtime Error/i,
      );
    });
  });
});
