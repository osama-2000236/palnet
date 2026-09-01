// A failed read is not an empty list.
//
// The shape this asserts has been fixed six times in this codebase — `/network`
// (#159), the room list (#160), the job page (#163), the profile editor (#158),
// the inbox's loading state (#166) and, in this pass, `/jobs`, `/messages/new`,
// the employer dashboard and its applicants list. Every one of them told the
// reader "there is nothing here" while the server had answered 500, and every
// one was found by photographing the error state rather than by a test.
//
// So: force every GET to fail, and assert that a screen showing a danger alert
// is not simultaneously showing an empty state. The alert is the answer; the
// empty state is a different, wrong answer to the same question.

import { expect, test, type Page } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

const ROUTES = [
  "/ar-PS/feed",
  "/ar-PS/jobs",
  "/ar-PS/network",
  "/ar-PS/saved",
  "/ar-PS/notifications",
  "/ar-PS/messages",
  "/ar-PS/messages/new",
  "/ar-PS/employer",
] as const;

async function state(page: Page): Promise<{ alerts: number; empties: number; text: string }> {
  return page.evaluate(() => ({
    // `role="alert"` is what `Alert` renders for danger and warning.
    alerts: document.querySelectorAll('[role="alert"]').length,
    empties: document.querySelectorAll("[data-empty-state]").length,
    text: (document.body.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
  }));
}

test.describe("error states", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, request }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-ar",
      "The copy is not the subject; the shape is.",
    );
    const auth = await ensureA11yStorageState(request);
    await page.addInitScript((s) => {
      window.localStorage.setItem("baydar.session.v1", s.session);
      window.localStorage.setItem("baydar.deviceId", s.deviceId);
    }, auth);

    await page.route("**/api/v1/**", async (route) => {
      const req = route.request();
      // Auth must keep working or every route renders the sign-in page, and an
      // SSE stream never closes, so `fulfill` on it would hang the run.
      if (req.url().includes("/auth/")) return route.continue();
      if (new URL(req.url()).pathname.endsWith("/stream")) return route.continue();
      if (req.method() !== "GET") return route.continue();
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL", message: "Forced QA failure" } }),
      });
    });
  });

  let sawAnyAlert = false;

  for (const route of ROUTES) {
    test(`a failed read is not an empty list: ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2_500);

      const found = await state(page);
      if (found.alerts > 0) sawAnyAlert = true;
      if (found.alerts === 0) return; // this screen has nothing to report a failure about

      expect(
        found.empties,
        `${route}: shows ${found.alerts} alert(s) AND ${found.empties} empty state(s) — two answers to one question:\n  ${found.text}`,
      ).toBe(0);
    });
  }

  test("the interceptor actually broke something", () => {
    // Without this the suite passes when every route renders fine, which is the
    // failure mode the specs in this repo keep tripping over.
    expect(sawAnyAlert, "no route reported an error — the 500s never reached the app").toBe(true);
  });
});
