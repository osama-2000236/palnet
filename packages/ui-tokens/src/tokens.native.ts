// packages/ui-tokens/src/tokens.native.ts
// Generated from index.ts. Consumed by apps/mobile.
// DO NOT EDIT BY HAND — regenerate with `pnpm tokens:build`.

export const nativeTokens = {
  color: {
    brand50:  "#f4f6ef",
    brand100: "#e6ebd6",
    brand200: "#ccd6a8",
    brand300: "#a9b878",
    brand400: "#879953",
    brand500: "#687a3a",
    brand600: "#526030",
    brand700: "#3f4a26",
    brand800: "#2e371d",
    brand900: "#1f2513",

    accent50:  "#fbf0ea",
    accent100: "#f4dbce",
    accent500: "#c65a3a",
    accent600: "#a8482c",
    accent700: "#8b3a22",

    ink:        "#1a1a17",
    inkMuted:   "#5c5a52",
    inkSubtle:  "#8a8880",
    inkInverse: "#ffffff",

    surface:       "#ffffff",
    surfaceMuted:  "#faf9f5",
    surfaceSubtle: "#f1efe7",
    surfaceSunken: "#ebe8dc",

    lineSoft: "rgba(26, 26, 23, 0.08)",
    lineHard: "rgba(26, 26, 23, 0.16)",

    success:     "#3b7a3b",
    successSoft: "rgba(59, 122, 59, 0.12)",
    warning:     "#b07a1a",
    warningSoft: "rgba(176, 122, 26, 0.12)",
    danger:      "#a83232",
    dangerSoft:  "rgba(168, 50, 50, 0.10)",
    info:        "#2f6d8a",
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
      h1:      { size: 22, weight: "600", line: 28 },
      h2:      { size: 18, weight: "600", line: 24 },
      h3:      { size: 16, weight: "600", line: 22 },
      body:    { size: 15, weight: "400", line: 24 },
      small:   { size: 13, weight: "400", line: 20 },
      caption: { size: 12, weight: "500", line: 16 },
    },
  },
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96 },
  chrome: {
    navHeight: 56,
    tabHeight: 64,
    minHit: 44, // Apple HIG + Material minimum touch target
  },
} as const;

export type NativeTokens = typeof nativeTokens;
export default nativeTokens;
