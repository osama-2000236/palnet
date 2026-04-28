// Axe-core sweep across every public surface in both locales.
// Authenticated pages (feed, jobs, profile, etc.) are out of scope here
// because session bootstrap needs a test user fixture — that's Sprint 7.
//
// Rules filtered to WCAG 2.1 AA + best-practice tags; violations fail the
// test with a full node list so the fix target is obvious.

import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

const PUBLIC_ROUTES: ReadonlyArray<{ path: string; label: string }> = [
  { path: "/", label: "root redirect" },
  { path: "/ar-PS", label: "landing (ar-PS)" },
  { path: "/en", label: "landing (en)" },
  { path: "/ar-PS/login", label: "login (ar-PS)" },
  { path: "/en/login", label: "login (en)" },
  { path: "/ar-PS/register", label: "register (ar-PS)" },
  { path: "/en/register", label: "register (en)" },
];

async function scan(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    // Next.js dev overlay/static indicators live outside the app landmark tree.
    .exclude("nextjs-portal")
    // Radix/Next focus rings already handled by our focus-visible utility
    // and color-contrast is checked separately per token; keep the full
    // list on for now and tighten if it becomes noisy.
    .analyze();

  if (results.violations.length > 0) {
    // Log a compact summary so CI output points at the exact offender.
    const summary = results.violations
      .map((v) => {
        const targets = v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join(" | ");
        return `${v.id} [${v.impact ?? "n/a"}]: ${v.help} → ${targets}`;
      })
      .join("\n");
    throw new Error(`axe violations:\n${summary}`);
  }
  expect(results.violations).toEqual([]);
}

for (const route of PUBLIC_ROUTES) {
  test(`a11y: ${route.label}`, async ({ page }) => {
    await page.goto(route.path);
    // Wait for the locale shell to render — landing pages have a heading,
    // auth pages have a form.
    await page.waitForLoadState("networkidle");
    await scan(page);
  });
}

const AUTHED_BASE_ROUTES: ReadonlyArray<{ path: (locale: string) => string; label: string }> = [
  { path: (locale) => `/${locale}/feed`, label: "feed" },
  { path: (locale) => `/${locale}/jobs`, label: "jobs" },
  { path: (locale) => `/${locale}/notifications`, label: "notifications" },
  { path: (locale) => `/${locale}/search`, label: "search" },
  { path: (locale) => `/${locale}/in/a11y-test`, label: "own profile" },
  { path: (locale) => `/${locale}/messages`, label: "messages" },
];

test.describe("authenticated routes", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, request }) => {
    test.skip(
      test.info().project.name !== "chromium-ar",
      "Authenticated locale sweep runs once; the route loop covers ar-PS and en.",
    );
    const auth = await ensureA11yStorageState(request);
    await page.addInitScript((state) => {
      window.localStorage.setItem("baydar.session.v1", state.session);
      window.localStorage.setItem("baydar.deviceId", state.deviceId);
    }, auth);
  });

  for (const locale of ["ar-PS", "en"] as const) {
    for (const route of AUTHED_BASE_ROUTES) {
      test(`a11y authed: ${route.label} (${locale})`, async ({ page }) => {
        await page.goto(route.path(locale));
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(750);
        await scan(page);
      });
    }

    test(`a11y authed: job detail (${locale})`, async ({ page, request }) => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
      const res = await request.get(`${apiBase}/jobs?limit=1`);
      test.skip(!res.ok(), "API unavailable for seeded job discovery.");
      const body = (await res.json()) as { data?: Array<{ id: string }> };
      const jobId = body.data?.[0]?.id;
      test.skip(!jobId, "No seeded job available for job detail a11y.");
      await page.goto(`/${locale}/jobs/${jobId}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(750);
      await scan(page);
    });
  }
});
