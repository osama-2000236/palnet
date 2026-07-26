// packages/ui-tokens/src/tokens.native.ts
// Generated from index.ts. Consumed by apps/mobile.
// DO NOT EDIT BY HAND — regenerate with `pnpm tokens:build`.

import { tokens } from "./index";

export const nativeTokens = {
  color: {
    brand50: "#f4f6ef",
    brand100: "#e6ebd6",
    brand200: "#ccd6a8",
    brand300: "#a9b878",
    brand400: "#879953",
    brand500: "#687a3a",
    brand600: "#526030",
    brand700: "#3f4a26",
    brand800: "#2e371d",
    brand900: "#1f2513",

    accent50: "#fbf0ea",
    accent100: "#f4dbce",
    accent500: "#c65a3a",
    accent600: "#a8482c",
    accent700: "#8b3a22",

    ink: "#1a1a17",
    inkMuted: "#5c5a52",
    inkSubtle: "#6e6d66",
    inkInverse: "#ffffff",

    surface: "#ffffff",
    surfaceMuted: "#faf9f5",
    surfaceSubtle: "#f1efe7",
    surfaceSunken: "#ebe8dc",

    lineSoft: "rgba(26, 26, 23, 0.08)",
    lineHard: "rgba(26, 26, 23, 0.16)",

    success: "#3b7a3b",
    successSoft: "rgba(59, 122, 59, 0.10)",
    successBorder: "rgba(59, 122, 59, 0.22)",
    warning: "#926516",
    warningSoft: "rgba(146, 101, 22, 0.10)",
    warningBorder: "rgba(146, 101, 22, 0.25)",
    danger: "#a83232",
    dangerSoft: "rgba(168, 50, 50, 0.08)",
    dangerBorder: "rgba(168, 50, 50, 0.22)",
    info: "#2f6d8a",
    infoSoft: "rgba(47, 109, 138, 0.08)",
    infoBorder: "rgba(47, 109, 138, 0.20)",
    scrim: "rgba(26, 26, 23, 0.40)",
  },
  radius: { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, full: 9999 },
  shadow: {
    // RN shadow spread across platforms
    card: {
      shadowColor: "#1a1a17",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    pop: {
      shadowColor: "#1a1a17",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 8,
    },
    nav: {
      shadowColor: "#1a1a17",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 0,
      elevation: 0,
    },
    modal: {
      shadowColor: "#1a1a17",
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
    },
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    13: 52,
    14: 56,
    15: 60,
    16: 64,
    17: 68,
    18: 72,
    19: 76,
    20: 80,
    21: 84,
    22: 88,
    23: 92,
    24: 96,
  },
  motion: {
    // Mirrors web easing for RN parity (DESIGN.md §12). `spring` = emphasized + overshoot.
    easing: {
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      emphasized: "cubic-bezier(0.3, 0, 0, 1.15)",
      spring: "cubic-bezier(0.34, 1.4, 0.5, 1)",
    },
    // A4.2: native previously carried no durations at all, which is why the
    // mobile app had no transitions — there was nothing tokenized to reach for.
    // These four are platform-neutral numbers, so they are referenced from the
    // canonical source rather than copied: a duplicated constant that drifts is
    // exactly the class of bug A1.6 and R2-10 were.
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
    navHeight: 56,
    tabHeight: 64,
    minHit: 44, // Apple HIG + Material minimum touch target
  },
  focus: {
    ringColor: "#526030",
    ringWidth: 2,
    ringOffset: 2,
  },
  avatar: {
    palette: [
      { bg: "#e6ebd6", fg: "#2e371d" },
      { bg: "#f4dbce", fg: "#8b3a22" },
      { bg: "#ebe8dc", fg: "#5c5a52" },
      { bg: "#ccd6a8", fg: "#3f4a26" },
      { bg: "#e8d5c2", fg: "#6e4424" },
    ],
  },
  illustration: {
    size: { sm: 96, md: 140, lg: 180 },
  },
  breakpoint: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
} as const;

export type NativeTokens = typeof nativeTokens;

// ── Warm-dark theme ─────────────────────────────────────────────────────────
// Designed in the Baydar Mobile Kit (May 2026). Warm charcoal, NOT pure black;
// olive + terracotta identity preserved. LIGHT IS THE DEFAULT — opt in with
// `getNativeTokens("dark")`. RN has no cascade, so this is a FULL bundle: it
// spreads the light tokens and overrides only what changes.
export const nativeTokensDark = {
  ...nativeTokens,
  color: {
    ...nativeTokens.color,
    brand50: "#262a1b",
    brand100: "#39431f",
    brand200: "#52612e",
    brand600: "#7e9442",
    brand700: "#9bb059",

    accent50: "#3a241c",
    accent100: "#4a2c20",
    accent600: "#cf6743",
    accent700: "#b5532f",

    ink: "#f1efe8",
    inkMuted: "#b3afa4",
    inkSubtle: "#9b988f",
    inkInverse: "#1a1a17",

    surface: "#232220",
    surfaceMuted: "#1a1916",
    surfaceSubtle: "#2d2b27",
    surfaceSunken: "#37342f",

    lineSoft: "rgba(255, 255, 255, 0.08)",
    lineHard: "rgba(255, 255, 255, 0.17)",

    // A6: all four re-lit. The previous note claimed warning + info "read fine
    // on warm charcoal"; measured, info was 2.61:1 against its own tint.
    success: "#6fae5f",
    successSoft: "rgba(111, 174, 95, 0.14)",
    successBorder: "rgba(111, 174, 95, 0.30)",
    warning: "#c09649",
    warningSoft: "rgba(192, 150, 73, 0.14)",
    warningBorder: "rgba(192, 150, 73, 0.30)",
    danger: "#df8282",
    dangerSoft: "rgba(223, 130, 130, 0.14)",
    dangerBorder: "rgba(223, 130, 130, 0.30)",
    info: "#7ba2b6",
    infoSoft: "rgba(123, 162, 182, 0.14)",
    infoBorder: "rgba(123, 162, 182, 0.30)",
    scrim: "rgba(0, 0, 0, 0.50)",
    switchThumb: "#f1efe8",
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
  // Focus ring follows brand-600, which lightens to #7e9442 at dark depth.
  focus: { ...nativeTokens.focus, ringColor: "#7e9442" },
  // Avatar fg resolved light-on-dark (mirrors the web dark-scope overrides).
  avatar: {
    palette: [
      { bg: "#39431f", fg: "#9bb059" },
      { bg: "#4a2c20", fg: "#cf6743" },
      { bg: "#37342f", fg: "#f1efe8" },
      { bg: "#52612e", fg: "#9bb059" },
      { bg: "#e8d5c2", fg: "#6e4424" },
    ],
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
