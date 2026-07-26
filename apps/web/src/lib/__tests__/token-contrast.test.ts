// A6 — WCAG contrast, computed from the shipped token values rather than
// eyeballed. Every pair here was failing at some point; the design brief's
// ledger listed them and the numbers below are what closed it.
//
// Reads `tokens` directly, so a token edit that regresses a ratio fails here
// and not in a screenshot three weeks later.

import { tokens } from "@baydar/ui-tokens";

type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const n = Number.parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]: RGB): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a: RGB, b: RGB): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** Composite `fg` at `alpha` over `bg` — how the semantic soft tints render. */
const over = (fg: RGB, alpha: number, bg: RGB): RGB =>
  fg.map((c, i) => c * alpha + (bg[i] as number) * (1 - alpha)) as RGB;

/** Alpha of the `*Soft` tints, parsed from the token so the two cannot drift. */
const softAlpha = (rgba: string): number => Number(rgba.split(",").pop()?.replace(")", "").trim());

const LIGHT = {
  surface: tokens.color.surface.DEFAULT,
  surfaceSubtle: tokens.color.surface.subtle,
  surfaceSunken: tokens.color.surface.sunken,
  ink: tokens.color.ink.DEFAULT,
  inkMuted: tokens.color.ink.muted,
  inkSubtle: tokens.color.ink.subtle,
  inkInverse: tokens.color.ink.inverse,
  brand600: tokens.color.brand[600],
  accent600: tokens.color.accent[600],
  ...tokens.color.semantic,
};

// Dark overrides only the tokens that change; everything else inherits light,
// which is exactly the trap A6 caught — `--info` inherited a light value and
// was never legible on the dark surface.
const DARK = {
  ...LIGHT,
  surface: tokens.dark.color.surface.DEFAULT,
  surfaceSubtle: tokens.dark.color.surface.subtle,
  surfaceSunken: tokens.dark.color.surface.sunken,
  ink: tokens.dark.color.ink.DEFAULT,
  inkMuted: tokens.dark.color.ink.muted,
  inkSubtle: tokens.dark.color.ink.subtle,
  inkInverse: tokens.dark.color.ink.inverse,
  brand600: tokens.dark.color.brand[600],
  accent600: tokens.dark.color.accent[600],
  ...tokens.dark.color.semantic,
};

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3; // WCAG 1.4.11

describe.each([
  ["light", LIGHT],
  ["dark", DARK],
])("contrast (%s)", (_name, t) => {
  const s = hex(t.surface);

  it.each([
    ["ink on surface", () => ratio(hex(t.ink), s)],
    ["ink-muted on surface", () => ratio(hex(t.inkMuted), s)],
    ["ink-subtle on surface", () => ratio(hex(t.inkSubtle), s)],
    ["ink-subtle on surface-subtle", () => ratio(hex(t.inkSubtle), hex(t.surfaceSubtle))],
    ["primary button label", () => ratio(hex(t.inkInverse), hex(t.brand600))],
    ["accent button label", () => ratio(hex(t.inkInverse), hex(t.accent600))],
    ["toast info label", () => ratio(hex(t.inkInverse), hex(t.info))],
    ["toast success label", () => ratio(hex(t.inkInverse), hex(t.success))],
    ["toast error label", () => ratio(hex(t.inkInverse), hex(t.danger))],
  ])("%s clears AA text", (_label, compute) => {
    expect(compute()).toBeGreaterThanOrEqual(AA_TEXT);
  });

  // Each semantic colour is read against a tint made from itself, which is how
  // Alert and Banner render it. Both sides move together when the token moves.
  it.each([
    ["success", t.success, t.successSoft],
    ["warning", t.warning, t.warningSoft],
    ["danger", t.danger, t.dangerSoft],
    ["info", t.info, t.infoSoft],
  ])("%s text clears AA on its own soft tint", (_label, solid, soft) => {
    const fg = hex(solid);
    expect(ratio(fg, over(fg, softAlpha(soft), s))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  // 1.23:1 — no fill in this palette can rescue the OFF switch track, so the
  // control draws a border instead and `--ink-subtle` is what it uses. This
  // asserts that token is a legal boundary; Switch.tsx is what applies it.
  it("ink-subtle is a legal non-text boundary against surface", () => {
    expect(ratio(hex(t.inkSubtle), s)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it("focus ring is visible against surface", () => {
    expect(ratio(hex(t.brand600), s)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
