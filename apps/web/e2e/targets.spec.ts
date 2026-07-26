// A3 — touch targets, measured rather than eyeballed.
//
// The design brief's most systemic finding: web `Switch` 20×36, `Checkbox`
// 16×16, `Button sm` 28, `Chip` 24/28, `Dialog` close 32, `Toast` dismiss 28 —
// every one under the 44pt/40px `CLAUDE.md` mandates.
//
// Small controls are not grown. They carry `.target-area`, a transparent
// `::before` that expands the *pressable* box while the rendered box keeps the
// density the design earned. That distinction is exactly why this has to be
// measured in a browser: the visible rect is still 28px, and the thing that
// matters is what a finger can hit.

import { expect, test, type Page } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

const ROUTES = [
  "/ar-PS/login",
  "/ar-PS/feed",
  "/ar-PS/jobs",
  "/ar-PS/search",
  "/ar-PS/notifications",
  "/ar-PS/saved",
  "/ar-PS/settings/notifications",
  "/ar-PS/settings/appearance",
  "/ar-PS/me/edit",
] as const;

const MIN = 44; // tokens.target.min

interface Undersized {
  tag: string;
  label: string;
  w: number;
  h: number;
}

/**
 * The effective hit box of every interactive element: the union of its own
 * border box and its `::before` expander, which is what `.target-area` adds.
 *
 * `getBoundingClientRect()` alone reports the visual box and would fail every
 * control the expander was built to rescue — measuring the wrong thing and
 * looking rigorous while doing it.
 */
async function undersized(page: Page): Promise<Undersized[]> {
  return page.evaluate((min) => {
    const out: Undersized[] = [];
    const selector =
      'button, a[href], [role="switch"], [role="tab"], input[type="checkbox"], label';
    for (const el of document.querySelectorAll(selector)) {
      const node = el as HTMLElement;
      if (node.hasAttribute("disabled") || node.getAttribute("aria-hidden") === "true") continue;
      if (node.closest("[inert], [aria-hidden='true'], nextjs-portal")) continue;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") continue;

      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      // A checkbox input is toggled by its own label; measuring the 16px box
      // in isolation reports a defect the label already covers.
      if (node.matches('input[type="checkbox"]') && node.closest("label")) continue;
      // Text links inside a paragraph are exempt from WCAG 2.5.8 (inline).
      if (node.matches("a[href]") && node.closest("p")) continue;
      // A <label> that is only a caption for a field is not itself a target.
      if (
        node.tagName === "LABEL" &&
        !node.querySelector('input[type="checkbox"], input[type="radio"]')
      )
        continue;

      const before = getComputedStyle(node, "::before");
      const expandW = before.content !== "none" ? Number.parseFloat(before.minWidth) || 0 : 0;
      const expandH = before.content !== "none" ? Number.parseFloat(before.minHeight) || 0 : 0;

      const w = Math.max(rect.width, expandW);
      const h = Math.max(rect.height, expandH);
      if (w >= min && h >= min) continue;

      out.push({
        tag: node.tagName.toLowerCase(),
        label: (node.getAttribute("aria-label") ?? node.textContent ?? "").trim().slice(0, 40),
        w: Math.round(w),
        h: Math.round(h),
      });
    }
    return out;
  }, MIN);
}

test.describe("touch targets", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-ar", "Geometry does not change with locale.");
    const auth = await ensureA11yStorageState(request);
    await page.addInitScript((state) => {
      window.localStorage.setItem("baydar.session.v1", state.session);
      window.localStorage.setItem("baydar.deviceId", state.deviceId);
    }, auth);
  });

  for (const route of ROUTES) {
    test(`no control is under ${MIN}px: ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("button, a[href]", { timeout: 30_000 });
      await page.waitForTimeout(800);

      const failures = await undersized(page);
      expect(
        failures,
        `${route}: controls below the ${MIN}px minimum:\n` +
          failures.map((f) => `  ${f.tag} "${f.label}" ${f.w}x${f.h}`).join("\n"),
      ).toEqual([]);
    });
  }

  // The Switch is the control the brief called out by name — most-tapped in
  // Settings, and 20×36 before this. Asserted on its own so a regression names
  // the component instead of a route.
  test("Switch clears the minimum while its track stays 20px", async ({ page }) => {
    await page.goto("/ar-PS/settings/notifications", { waitUntil: "domcontentloaded" });
    const track = page.locator('[role="switch"]').first();
    await track.waitFor({ timeout: 30_000 });

    const box = await track.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const wrapper = (el.parentElement as HTMLElement).getBoundingClientRect();
      return { trackH: rect.height, pressH: wrapper.height, pressW: wrapper.width };
    });

    // Visual density preserved…
    expect(Math.round(box.trackH)).toBeLessThanOrEqual(24);
    // …pressable area legal.
    expect(box.pressH).toBeGreaterThanOrEqual(MIN);
    expect(box.pressW).toBeGreaterThanOrEqual(MIN);
  });
});
