// packages/ui-tokens/src/tokens.native.ts
// The React Native bundle. Consumed by apps/mobile.
//
// NOT generated, and no longer pretending to be. Three things here are
// genuinely platform-specific and cannot be derived from index.ts:
//
//   • `shadow` — RN wants shadowColor/Offset/Opacity/Radius plus an Android
//     `elevation`, not a CSS box-shadow string. The elevations are hand-picked.
//   • `type.scale` — the mobile scale is deliberately tighter than web's
//     (DESIGN.md §5 mobile), and `line` is px here, a unitless ratio there.
//   • `type.family` — PostScript font names, not CSS font stacks.
//
// Everything else REFERENCES `tokens`. It used to restate ~55 hex literals,
// which is how a value could change on web and stay put on native. If a value
// appears twice in this file, that is a bug.

import { tokens } from "./index";

const c = tokens.color;
const d = tokens.dark.color;

/**
 * Resolve an avatar palette ref (`brand.100`) against the DARK palette, falling
 * back to light for depths dark does not override, and passing literals
 * through. Web gets this for free from the CSS cascade; RN has no cascade, so
 * the lookup is explicit.
 */
function resolveDark(ref: string): string {
  if (ref.startsWith("#")) return ref;
  const [group, key] = ref.split(".") as [keyof typeof d, string];
  const lookup = (palette: unknown): string | undefined =>
    (palette as Record<string, string | undefined> | undefined)?.[key];
  const value = lookup(d[group]) ?? lookup(c[group as keyof typeof c]);
  // A ref that resolves to nothing would render a transparent avatar chip.
  // Fail the build instead — this file is compiled, so a typo cannot ship.
  if (!value) throw new Error(`tokens.native: unresolved avatar palette ref "${ref}"`);
  return value;
}

export const nativeTokens = {
  color: {
    brand50: c.brand[50],
    brand100: c.brand[100],
    brand200: c.brand[200],
    brand300: c.brand[300],
    brand400: c.brand[400],
    brand500: c.brand[500],
    brand600: c.brand[600],
    brand700: c.brand[700],
    brand800: c.brand[800],
    brand900: c.brand[900],

    accent50: c.accent[50],
    accent100: c.accent[100],
    accent500: c.accent[500],
    accent600: c.accent[600],
    accent700: c.accent[700],

    ink: c.ink.DEFAULT,
    inkMuted: c.ink.muted,
    inkSubtle: c.ink.subtle,
    inkInverse: c.ink.inverse,

    surface: c.surface.DEFAULT,
    surfaceMuted: c.surface.muted,
    surfaceSubtle: c.surface.subtle,
    surfaceSunken: c.surface.sunken,

    lineSoft: c.line.soft,
    lineHard: c.line.hard,

    success: c.semantic.success,
    successSoft: c.semantic.successSoft,
    successBorder: c.semantic.successBorder,
    warning: c.semantic.warning,
    warningSoft: c.semantic.warningSoft,
    warningBorder: c.semantic.warningBorder,
    danger: c.semantic.danger,
    dangerSoft: c.semantic.dangerSoft,
    dangerBorder: c.semantic.dangerBorder,
    info: c.semantic.info,
    infoSoft: c.semantic.infoSoft,
    infoBorder: c.semantic.infoBorder,
    scrim: c.semantic.scrim,
    // A1.1 — one thumb colour for both platforms. The dark override sits in the
    // dark block below; the switch draws a border so it stays visible against
    // the light OFF track, which no fill can rescue (A6, 1.23:1).
    switchThumb: tokens.control.switchThumb,
  },
  radius: tokens.radius,
  shadow: {
    // RN shadow spread across platforms. Elevation has no web twin — it is the
    // Android depth cue, picked per layer rather than derived.
    card: {
      shadowColor: c.ink.DEFAULT,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    pop: {
      shadowColor: c.ink.DEFAULT,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 8,
    },
    nav: {
      shadowColor: c.ink.DEFAULT,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 0,
      elevation: 0,
    },
    modal: {
      shadowColor: c.ink.DEFAULT,
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.2,
      shadowRadius: 60,
      elevation: 12,
    },
  },
  type: {
    family: {
      sans: "IBMPlexSansArabic",
      body: "NotoNaskhArabic",
      mono: "IBMPlexMono",
    },
    // Mobile scale — slightly tighter than web (per DESIGN.md §5 mobile)
    scale: {
      display: { size: 28, weight: "700", line: 34 },
      h1: { size: 22, weight: "600", line: 28 },
      h2: { size: 18, weight: "600", line: 24 },
      h3: { size: 16, weight: "600", line: 22 },
      body: { size: 15, weight: "400", line: 24 },
      small: { size: 13, weight: "400", line: 20 },
      caption: { size: 12, weight: "500", line: 16 },
      // Eighth step, mirroring tokens.type.scale.micro on web. The floor for
      // dense chrome — nothing renders below it.
      // Tighter than the rest on purpose — see the web twin's comment.
      micro: { size: 11, weight: "500", line: 14 },
    },
  },
  space: tokens.space,
  motion: {
    // Mirrors web easing for RN parity (DESIGN.md §12). `spring` = emphasized + overshoot.
    easing: tokens.motion.easing,
    // A4.2: native previously carried no durations at all, which is why the
    // mobile app had no transitions — there was nothing tokenized to reach for.
    duration: tokens.motion.duration,
    spring: tokens.motion.spring,
    stagger: tokens.motion.stagger,
    enter: tokens.motion.enter,
  },
  state: tokens.state,
  target: tokens.target,
  z: tokens.z,
  control: tokens.control,
  chrome: {
    navHeight: tokens.chrome.navHeight,
    tabHeight: tokens.chrome.mobileTabHeight,
    minHit: tokens.target.min, // Apple HIG + Material minimum touch target
  },
  focus: {
    ringColor: c.brand[600],
    ringWidth: tokens.focus.width,
    ringOffset: tokens.focus.offset,
  },
  avatar: {
    palette: [
      { bg: c.brand[100], fg: c.brand[800] },
      { bg: c.accent[100], fg: c.accent[700] },
      { bg: c.surface.sunken, fg: c.ink.muted },
      { bg: c.brand[200], fg: c.brand[700] },
      { bg: "#e8d5c2", fg: "#6e4424" },
    ],
  },
  illustration: {
    size: tokens.illustration.size,
  },
  breakpoint: tokens.breakpoint,
} as const;

export type NativeTokens = typeof nativeTokens;

// ── Warm-dark theme ─────────────────────────────────────────────────────────
// LIGHT IS THE DEFAULT — opt in with `getNativeTokens("dark")`. RN has no
// cascade, so this is a FULL bundle: it spreads the light tokens and overrides
// only what changes.
export const nativeTokensDark = {
  ...nativeTokens,
  color: {
    ...nativeTokens.color,
    brand50: d.brand[50],
    brand100: d.brand[100],
    brand200: d.brand[200],
    brand600: d.brand[600],
    brand700: d.brand[700],

    accent50: d.accent[50],
    accent100: d.accent[100],
    accent600: d.accent[600],
    accent700: d.accent[700],

    ink: d.ink.DEFAULT,
    inkMuted: d.ink.muted,
    inkSubtle: d.ink.subtle,
    inkInverse: d.ink.inverse,

    surface: d.surface.DEFAULT,
    surfaceMuted: d.surface.muted,
    surfaceSubtle: d.surface.subtle,
    surfaceSunken: d.surface.sunken,

    lineSoft: d.line.soft,
    lineHard: d.line.hard,

    // A6: all four re-lit. The previous note claimed warning + info "read fine
    // on warm charcoal"; measured, info was 2.61:1 against its own tint.
    success: d.semantic.success,
    successSoft: d.semantic.successSoft,
    successBorder: d.semantic.successBorder,
    warning: d.semantic.warning,
    warningSoft: d.semantic.warningSoft,
    warningBorder: d.semantic.warningBorder,
    danger: d.semantic.danger,
    dangerSoft: d.semantic.dangerSoft,
    dangerBorder: d.semantic.dangerBorder,
    info: d.semantic.info,
    infoSoft: d.semantic.infoSoft,
    infoBorder: d.semantic.infoBorder,
    scrim: d.semantic.scrim,
    switchThumb: d.control.switchThumb,
  },
  shadow: {
    // Pure black, higher opacity — warm-ink shadows are invisible on dark.
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.42,
      shadowRadius: 3,
      elevation: 2,
    },
    pop: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 28,
      elevation: 10,
    },
    nav: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.4,
      shadowRadius: 0,
      elevation: 0,
    },
    modal: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.6,
      shadowRadius: 60,
      elevation: 14,
    },
  },
  // Focus ring follows brand-600, which lightens at dark depth.
  focus: { ...nativeTokens.focus, ringColor: d.brand[600] },
  // Avatar fg resolved light-on-dark (mirrors the web dark-scope overrides).
  avatar: {
    palette: tokens.dark.avatar.palette.map(({ bg, fg }) => ({
      bg: resolveDark(bg),
      fg: resolveDark(fg),
    })),
  },
} as const;

// Both bundles share the same shape. We expose them under the light bundle's
// type so consumers keep the precise literal types (e.g. fontWeight "600") —
// this makes migrating an atom from `nativeTokens` to a theme-aware lookup a
// friction-free find-replace with no new type errors. The dark bundle's colour
// strings differ only in value, never in shape, so the cast is sound.
export type NativeTheme = NativeTokens;

export type ColorScheme = "light" | "dark";

/** Pick the native token bundle for a color scheme. Light is the default. */
export function getNativeTokens(scheme: ColorScheme = "light"): NativeTheme {
  return scheme === "dark" ? (nativeTokensDark as unknown as NativeTokens) : nativeTokens;
}

export default nativeTokens;
