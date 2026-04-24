// Design tokens for the PalNet prototype.
// These mirror packages/ui-tokens/src/index.ts naming so they can be ported back
// 1:1. Values are opinionated upgrades on the current palette (away from generic
// Tailwind blue, toward an olive/charcoal identity).

window.PALNET_TOKENS = {
  color: {
    // Primary: deep olive — recognisably regional, not LinkedIn blue, serious.
    brand: {
      50: "#f4f6ef",
      100: "#e6ebd6",
      200: "#ccd6a8",
      300: "#a9b878",
      400: "#879953",
      500: "#687a3a", // primary
      600: "#526030",
      700: "#3f4a26",
      800: "#2e371d",
      900: "#1f2513",
    },
    // Accent: warm terracotta. Use *sparingly* — badges, highlights, one CTA per screen.
    accent: {
      50: "#fbf0ea",
      500: "#c65a3a",
      600: "#a8482c",
    },
    // Ink = text. Warmer than slate; pairs with olive.
    ink: {
      DEFAULT: "#1a1a17",
      muted: "#5c5a52",
      subtle: "#8a8880",
    },
    // Surface: slightly warm off-whites.
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
      warning: "#b07a1a",
      danger: "#a83232",
      info: "#2f6d8a",
    },
  },
  radius: { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, full: 9999 },
  shadow: {
    card: "0 1px 2px rgba(26,26,23,0.04), 0 1px 3px rgba(26,26,23,0.05)",
    pop: "0 10px 28px rgba(26,26,23,0.12)",
  },
  type: {
    family: {
      sans: '"IBM Plex Sans Arabic", "IBM Plex Sans", system-ui, sans-serif',
      body: '"Noto Naskh Arabic", "IBM Plex Sans Arabic", system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
    },
    // 5-step scale with intentional weight + tracking
    scale: {
      display: { size: 36, weight: 700, line: 1.15, track: "-0.01em" },
      h1: { size: 26, weight: 600, line: 1.25, track: "-0.005em" },
      h2: { size: 19, weight: 600, line: 1.35 },
      body: { size: 15, weight: 400, line: 1.6 },
      small: { size: 13, weight: 400, line: 1.5 },
      caption: { size: 12, weight: 500, line: 1.4, track: "0.01em" },
    },
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
};
