// Axe-core sweep across every public surface in both locales.
// Authenticated pages (feed, jobs, profile, etc.) are out of scope here
// because session bootstrap needs a test user fixture — that's Sprint 7.
//
// Rules filtered to WCAG 2.1 AA + best-practice tags; violations fail the
// test with a full node list so the fix target is obvious.

import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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
