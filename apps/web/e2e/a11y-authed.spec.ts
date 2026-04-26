// Authenticated axe sweep — mirrors a11y.spec.ts but runs after a real
// session is provisioned via the API. Targets the surfaces a signed-in
// user hits most: feed, profile, jobs, notifications, messaging.
//
// Same WCAG 2.1 AA + best-practice tags as the public sweep. If any
// violation appears, the test fails with a compact target list so the
// offender is obvious in CI logs.

import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginViaApi, setSession, type TestUser } from "./helpers";

type AuthedRoute = { path: (user: TestUser) => string; label: string };

const AUTHED_ROUTES: ReadonlyArray<AuthedRoute> = [
  { path: () => "/en/feed", label: "feed (en)" },
  { path: () => "/ar-PS/feed", label: "feed (ar-PS)" },
  { path: (u) => `/en/in/${u.handle}`, label: "own profile (en)" },
  { path: () => "/en/jobs", label: "jobs list (en)" },
  { path: () => "/en/notifications", label: "notifications (en)" },
  { path: () => "/en/messages", label: "messages (en)" },
  { path: () => "/en/search", label: "search (en)" },
  { path: () => "/en/settings", label: "settings index (en)" },
  { path: () => "/en/settings/account", label: "settings/account (en)" },
  { path: () => "/en/settings/sessions", label: "settings/sessions (en)" },
  {
    path: () => "/en/settings/notifications",
    label: "settings/notifications (en)",
  },
  { path: () => "/en/settings/blocks", label: "settings/blocks (en)" },
  { path: () => "/ar-PS/settings/blocks", label: "settings/blocks (ar-PS)" },
];

async function scan(page: Page): Promise<void> {
  await page.locator("main").first().waitFor({ timeout: 15_000 });
  await page.locator("h1").first().waitFor({ timeout: 15_000 });
  await expect(page.getByRole("banner")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();

  if (results.violations.length > 0) {
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

test.describe("a11y (authed)", () => {
  let user: TestUser;

  test.beforeAll(async ({ request }) => {
    const session = await loginViaApi(request, "demo@palnet.ps", "Password123");
    user = {
      firstName: "Demo",
      lastName: "User",
      email: "demo@palnet.ps",
      password: "Password123",
      handle: "demo",
      session,
    };
  });

  for (const route of AUTHED_ROUTES) {
    test(`a11y: ${route.label}`, async ({ page }) => {
      await setSession(page, user.session);
      await page.goto(route.path(user));
      await page.waitForLoadState("domcontentloaded");
      await page.locator("body").waitFor();
      await scan(page);
    });
  }
});
