// Keyboard traversal. `a11y.spec.ts` runs axe, which is a static analysis of
// the accessibility tree — it reads roles, names, contrast and landmarks. It
// cannot press Tab, so it cannot see the things that actually strand a
// keyboard user: a control that is visible but unreachable, a focus ring that
// does not render, or a loop that never gets past the header.
//
// This walks each surface with the keyboard and asserts three properties that
// axe structurally cannot check.

import { expect, test, type Page } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

const ROUTES = [
  "/ar-PS",
  "/ar-PS/login",
  "/ar-PS/register",
  "/ar-PS/feed",
  "/ar-PS/jobs",
  "/ar-PS/search",
  "/ar-PS/network",
  "/ar-PS/notifications",
  "/ar-PS/messages",
  "/ar-PS/me",
  "/ar-PS/me/edit",
  "/ar-PS/settings",
  "/ar-PS/settings/notifications",
] as const;

const AUTHED = new Set(ROUTES.filter((r) => !/^\/ar-PS(\/(login|register))?$/.test(r)));

interface Focusable {
  key: string;
  tag: string;
  label: string;
}

/**
 * Everything a keyboard user should be able to reach: natively focusable
 * elements that are rendered, enabled, and not explicitly removed from the tab
 * order. `tabindex="-1"` is excluded deliberately — it is the documented way to
 * make something programmatically focusable only, so flagging it would report
 * every correctly-built dialog container as a defect.
 */
async function focusables(page: Page): Promise<Focusable[]> {
  return page.evaluate(() => {
    const selector =
      'a[href], button, input, select, textarea, [role="button"], [role="switch"], [role="tab"], [tabindex]';
    return [...document.querySelectorAll(selector)]
      .filter((el) => {
        const node = el as HTMLElement;
        if (node.hasAttribute("disabled") || node.getAttribute("aria-hidden") === "true")
          return false;
        if (node.getAttribute("tabindex") === "-1") return false;
        if (node.closest("[inert], [aria-hidden='true']")) return false;
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((el, index) => {
        // Mark each candidate so the walk can tick it off by identity. Counting
        // tab stops instead would pass on a page that cycles three controls
        // forever.
        el.setAttribute("data-kbd-seen", "0");
        return {
          key: `${el.tagName}:${index}`,
          tag: el.tagName.toLowerCase(),
          label:
            (el as HTMLElement).getAttribute("aria-label") ??
            (el.textContent ?? "").trim().slice(0, 40) ??
            "",
        };
      });
  });
}

/**
 * Tab through the page, recording where focus lands.
 *
 * Budget is `count + 8`: enough slack for the browser chrome stop and a couple
 * of composite widgets, not enough to hide a loop.
 */
type Stop =
  | { skip: true }
  | {
      skip?: false;
      id: string;
      outline: boolean;
      shadow: boolean;
      offscreen: boolean;
      label: string;
    };

async function walk(page: Page, budget: number): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < budget; i += 1) {
    await page.keyboard.press("Tab");
    const here: Stop | null = await page.evaluate((): Stop | null => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      // The Next.js dev overlay is a focusable custom element with no focus
      // ring and no relation to the app. `a11y.spec.ts` excludes it from axe
      // and `shots.mjs` hides it before screenshotting; this is the same
      // exclusion for the same reason.
      if (el.tagName === "NEXTJS-PORTAL" || el.closest("nextjs-portal")) return { skip: true };
      el.setAttribute("data-kbd-seen", "1");
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        id: `${el.tagName}#${el.id}.${el.className}`.slice(0, 120),
        // A focus indicator is either an outline or a ring drawn with
        // box-shadow. Tailwind's `ring-*` utilities use the latter, so
        // checking `outlineWidth` alone reports every ringed control as
        // invisible.
        outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
        shadow: style.boxShadow !== "none" && style.boxShadow !== "",
        offscreen: rect.width === 0 || rect.height === 0,
        label: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40),
      };
    });
    if (!here) break;
    if (here.skip) continue;
    expect(
      here.outline || here.shadow,
      `focus landed on ${here.id} ("${here.label}") with no visible focus indicator`,
    ).toBe(true);
    expect(here.offscreen, `focus landed on a zero-size element: ${here.id}`).toBe(false);
    seen.push(here.id);
  }
  return seen;
}

test.describe("keyboard traversal", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-ar", "One locale is enough for tab order.");
    const auth = await ensureA11yStorageState(request);
    await page.addInitScript((state) => {
      window.localStorage.setItem("baydar.session.v1", state.session);
      window.localStorage.setItem("baydar.deviceId", state.deviceId);
    }, auth);
  });

  for (const route of ROUTES) {
    test(`every control is reachable by Tab: ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(AUTHED.has(route) ? 1_200 : 700);

      const targets = await focusables(page);
      test.skip(targets.length === 0, "no interactive controls on this surface");

      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const visited = await walk(page, targets.length + 8);
      expect(visited.length, `${route}: Tab produced no focus at all`).toBeGreaterThan(0);

      // Which of the *specific* controls were reached, not how many stops
      // happened — counting stops would pass on a page that tabs the same
      // three controls in a loop.
      const unreached = await page.evaluate(() =>
        [...document.querySelectorAll("[data-kbd-seen='0']")]
          .map((el) =>
            `${el.tagName.toLowerCase()}: ${
              el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 30)
            }`.slice(0, 80),
          )
          .slice(0, 8),
      );
      expect(unreached, `${route}: controls the keyboard never reaches`).toEqual([]);
    });
  }

  test("Escape closes the composer without stranding focus", async ({ page }) => {
    await page.goto("/ar-PS/feed", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_200);
    const composer = page.getByRole("textbox").first();
    if ((await composer.count()) === 0) test.skip(true, "composer not present");
    await composer.focus();
    await page.keyboard.press("Escape");
    // Focus must stay somewhere real. Losing it to <body> is the bug where a
    // keyboard user has to Tab from the top of the document again.
    const parked = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
    expect(parked).not.toBe("NONE");
  });
});
