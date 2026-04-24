// packages/ui-tokens/src/index.ts
// Baydar design tokens — the SINGLE source of truth.
// Consumed by: ui-web (via Tailwind preset + CSS vars), ui-native (RN objects).
// Never edit the generated .css or .native.ts — regenerate with `pnpm tokens:build`.

export const tokens = {
  color: {
    // Primary: deep olive. Not Tailwind blue. This is the Baydar mark color.
    brand: {
      50: "#f4f6ef",
      100: "#e6ebd6",
      200: "#ccd6a8",
      300: "#a9b878",
      400: "#879953",
      500: "#687a3a",
      600: "#526030", // primary
      700: "#3f4a26", // hover
      800: "#2e371d",
      900: "#1f2513",
    },
    // Accent: terracotta. ONE CTA per screen, unread badges, notification dots.
    accent: {
      50: "#fbf0ea",
      100: "#f4dbce",
      500: "#c65a3a",
      600: "#a8482c", // accent
      700: "#8b3a22",
    },
    // Ink = foreground text. Warmer than slate.
    ink: {
      DEFAULT: "#1a1a17",
      muted: "#5c5a52",
      subtle: "#8a8880",
      inverse: "#ffffff",
    },
    // Surface = backgrounds. Subtly warm.
    surface: {
      DEFAULT: "#ffffff",
      muted: "#faf9f5",
      subtle: "#f1efe7",
      sunken: "#ebe8dc",
    },
    line: {
      soft: "rgba(26, 26, 23, 0.08)",
      hard: "rgba(26, 26, 23, 0.16)",
    },
    semantic: {
      success: "#3b7a3b",
      successSoft: "rgba(59, 122, 59, 0.12)",
      warning: "#b07a1a",
      warningSoft: "rgba(176, 122, 26, 0.12)",
      danger: "#a83232",
      dangerSoft: "rgba(168, 50, 50, 0.10)",
      info: "#2f6d8a",
    },
  },
  radius: { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, full: 9999 } as const,
  shadow: {
    card: "0 1px 2px rgba(26,26,23,0.04), 0 1px 3px rgba(26,26,23,0.05)",
    pop: "0 10px 28px rgba(26,26,23,0.12)",
  },
  type: {
    family: {
      sans: `"IBM Plex Sans Arabic", "IBM Plex Sans", system-ui, sans-serif`,
      body: `"Noto Naskh Arabic", "IBM Plex Sans Arabic", system-ui, sans-serif`,
      mono: `"IBM Plex Mono", ui-monospace, monospace`,
    },
    scale: {
      display: { size: 36, weight: 700, line: 1.15, track: "-0.01em" },
      h1: { size: 26, weight: 600, line: 1.25, track: "-0.005em" },
      h2: { size: 19, weight: 600, line: 1.35, track: "0" },
      h3: { size: 16, weight: 600, line: 1.4, track: "0" },
      body: { size: 15, weight: 400, line: 1.6, track: "0" },
      small: { size: 13, weight: 400, line: 1.5, track: "0" },
      caption: { size: 12, weight: 500, line: 1.4, track: "0.01em" },
    },
  },
  // 4px unit scale. Stick to these values.
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  } as const,
  // Motion
  motion: {
    duration: { fast: 80, base: 120, slow: 240 },
    easing: { standard: "cubic-bezier(0.2, 0, 0, 1)", emphasized: "cubic-bezier(0.3, 0, 0, 1.15)" },
  },
  // Surface variant recipes — see DESIGN.md §3.
  surfaceRecipes: {
    flat: { bg: "surface.DEFAULT", border: "line.soft", radius: "md", shadow: "none" },
    card: { bg: "surface.DEFAULT", border: "line.soft", radius: "lg", shadow: "card" },
    hero: { bg: "surface.DEFAULT", border: "line.soft", radius: "xl", shadow: "card" },
    tinted: { bg: "surface.subtle", border: "transparent", radius: "md", shadow: "none" },
    row: { bg: "transparent", border: "line.soft", radius: "none", shadow: "none" },
  },
  // App chrome
  chrome: {
    navHeight: 56,
    maxContentWidth: 1128,
    mobileTabHeight: 64,
  },
} as const;

export type Tokens = typeof tokens;
export default tokens;

// Re-export the RN-shaped tokens so consumers can do:
//   import { nativeTokens } from "@palnet/ui-tokens";
// without needing a subpath export.
export { nativeTokens } from "./tokens.native";
export type { NativeTokens } from "./tokens.native";
