// Scroll strips must not fade away their own content.
//
// `Tabs` and the app-shell nav are one-row horizontal scrollers with the
// scrollbar hidden, so an edge fade is the only affordance saying "there is
// more this way". That fade used to be a fixed `mask-image`, and a mask paints
// on the scrollport rather than on the content: on `/network`, where the strip
// reports `scrollWidth === clientWidth`, it erased the first 16px of the active
// tab — the opening letter of `علاقاتي` — on a strip with nothing to scroll to.
//
// Measured in a browser because none of it exists in jsdom: no layout, no
// scroll geometry, no mask.

import { expect, test, type Page } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

// One route per strip shape: a tablist that fits, a tablist that does not, and
// the nav (which overflows at every mobile width).
const ROUTES = ["/ar-PS/network", "/ar-PS/search?q=%D9%85", "/ar-PS/feed"] as const;

interface Strip {
  role: string;
  overflowsStart: boolean;
  overflowsEnd: boolean;
  fadesLeft: boolean;
  fadesRight: boolean;
}

/**
 * For every strip on the page: does content actually hang off each physical
 * edge, and does the mask fade that edge?
 *
 * Child rects rather than `scrollLeft`, because RTL scroll offsets are reported
 * differently by every engine and a rect comparison is true in all of them.
 */
async function strips(page: Page): Promise<Strip[]> {
  return page.evaluate(() => {
    const out: Strip[] = [];
    for (const el of document.querySelectorAll('[role="tablist"], nav[aria-label]')) {
      const node = el as HTMLElement;
      if (getComputedStyle(node).overflowX !== "auto") continue;
      const box = node.getBoundingClientRect();
      if (box.width === 0) continue;

      let left = false;
      let right = false;
      for (const child of Array.from(node.children)) {
        const rect = child.getBoundingClientRect();
        if (rect.left < box.left - 1) left = true;
        if (rect.right > box.right + 1) right = true;
      }

      const mask = getComputedStyle(node).maskImage;
      out.push({
        role: node.getAttribute("role") ?? node.tagName.toLowerCase(),
        overflowsStart: left,
        overflowsEnd: right,
        // The gradient runs `to right`, so a transparent stop at 0 fades the
        // left edge and one at 100% fades the right.
        fadesLeft: /rgba\(0, 0, 0, 0\) 0px/.test(mask),
        fadesRight: /rgba\(0, 0, 0, 0\) 100%/.test(mask),
      });
    }
    return out;
  });
}

test.describe("scroll strips", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-ar", "The clipped edge is the RTL start edge.");
    const auth = await ensureA11yStorageState(request);
    await page.addInitScript((state) => {
      window.localStorage.setItem("baydar.session.v1", state.session);
      window.localStorage.setItem("baydar.deviceId", state.deviceId);
    }, auth);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  for (const route of ROUTES) {
    test(`fades only the edge that hides content: ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[role="tablist"], nav[aria-label]', { timeout: 30_000 });
      await page.waitForTimeout(800);

      const found = await strips(page);
      expect(found.length, `${route}: no strip found to measure`).toBeGreaterThan(0);
      for (const strip of found) {
        expect(
          strip.fadesLeft,
          `${route}: ${strip.role} fades its left edge with nothing hidden there`,
        ).toBe(strip.overflowsStart);
        expect(
          strip.fadesRight,
          `${route}: ${strip.role} fades its right edge with nothing hidden there`,
        ).toBe(strip.overflowsEnd);
      }
    });
  }
});
