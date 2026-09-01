// User text carries its own direction, or its punctuation moves.
//
// A sentence's trailing full stop is a bidi-neutral character, so it takes the
// direction of the paragraph around it rather than of the sentence it belongs
// to. An Arabic job description inside the English UI therefore painted
// ".تمديدات وصيانة لوحات توزيع" — the stop first, at the far left — and an
// English "About" inside the Arabic UI painted ".Baydar is building…" the same
// way. Both photographed, on `/en/jobs/[id]` and `/ar-PS/company/[slug]`.
//
// The rule: anything rendering text somebody typed sets `unicode-bidi:
// plaintext`, which resolves direction per paragraph from its first strong
// character. `white-space: pre-wrap` is the marker for those blocks — it is
// what a user-text container needs and what nothing else here uses.
//
// The feed is the one route whose user text this suite can guarantee, so it
// seeds a post and then insists on finding at least one such block: a run that
// found nothing would pass while asserting nothing, which is the failure mode
// this file exists to avoid.

import { expect, test } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

interface Block {
  text: string;
  bidi: string;
}

test.beforeEach(async ({ page, request }) => {
  test.skip(
    test.info().project.name !== "chromium-ar",
    "One direction is enough to catch the rule; the RTL page is where it was photographed.",
  );
  const auth = await ensureA11yStorageState(request);
  const token = (JSON.parse(auth.session) as { tokens: { accessToken: string } }).tokens
    .accessToken;
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  await request.post(`${api}/posts`, {
    headers: { Authorization: `Bearer ${token}` },
    // Ends in a full stop on purpose: that character is the one bidi moves.
    data: { body: "منشور اختبار لاتجاه النص.", language: "ar" },
  });
  await page.addInitScript((state) => {
    window.localStorage.setItem("baydar.session.v1", state.session);
    window.localStorage.setItem("baydar.deviceId", state.deviceId);
  }, auth);
});

test("every block of user text resolves its own direction", async ({ page }) => {
  await page.goto("/ar-PS/feed", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button.react-press", { timeout: 60_000 });

  const blocks = await page.evaluate(() => {
    const out: Block[] = [];
    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el as HTMLElement);
      if (style.whiteSpace !== "pre-wrap") continue;
      out.push({ text: (el.textContent ?? "").trim().slice(0, 40), bidi: style.unicodeBidi });
    }
    return out;
  });

  expect(
    blocks.length,
    "no user-text block on the feed — the check asserted nothing",
  ).toBeGreaterThan(0);
  expect(
    blocks.filter((b) => b.bidi !== "plaintext"),
    "blocks rendering user text without unicode-bidi: plaintext",
  ).toEqual([]);
});
