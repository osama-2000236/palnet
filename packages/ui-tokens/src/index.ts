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
      successSoft: "rgba(59, 122, 59, 0.10)",
      successBorder: "rgba(59, 122, 59, 0.22)",
      warning: "#b07a1a",
      warningSoft: "rgba(176, 122, 26, 0.10)",
      warningBorder: "rgba(176, 122, 26, 0.25)",
      danger: "#a83232",
      dangerSoft: "rgba(168, 50, 50, 0.08)",
      dangerBorder: "rgba(168, 50, 50, 0.22)",
      info: "#2f6d8a",
      infoSoft: "rgba(47, 109, 138, 0.08)",
      infoBorder: "rgba(47, 109, 138, 0.20)",
      scrim: "rgba(26, 26, 23, 0.40)",
    },
    cover: {
      // The ONLY decorative gradient in the system (DESIGN.md §13). Olive Depth:
      // brand-500 → brand-700. Generated CSS var references brand vars, not hex.
      gradient: "linear-gradient(135deg, #687a3a, #3f4a26)",
    },
  },
  radius: { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, full: 9999 } as const,
  shadow: {
    card: "0 1px 2px rgba(26,26,23,0.04), 0 1px 3px rgba(26,26,23,0.05)",
    pop: "0 10px 28px rgba(26,26,23,0.12)",
    nav: "0 1px 0 rgba(26,26,23,0.06)",
    modal: "0 24px 60px rgba(26,26,23,0.20), 0 4px 12px rgba(26,26,23,0.08)",
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
  } as const,
  // Motion
  motion: {
    duration: { fast: 80, base: 120, slow: 240 },
    easing: {
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      emphasized: "cubic-bezier(0.3, 0, 0, 1.15)",
      spring: "cubic-bezier(0.34, 1.4, 0.5, 1)", // emphasized + overshoot for entrances
    },
    stagger: { step: 40, max: 6 }, // ms between list items; cap at 6 (6×40 = 240ms = --dur-slow)
    enter: { rise: 8 }, // px translateY on entrance (= space[2])
  },
  focus: {
    ring: "0 0 0 var(--focus-ring-offset) var(--surface), 0 0 0 calc(var(--focus-ring-offset) + var(--focus-ring-width)) var(--focus-ring-color)",
    color: "var(--brand-600)",
    width: 2,
    offset: 2,
  },
  avatar: {
    palette: [
      { bg: "brand.100", fg: "brand.800" },
      { bg: "accent.100", fg: "accent.700" },
      { bg: "surface.sunken", fg: "ink.muted" },
      { bg: "brand.200", fg: "brand.700" },
      { bg: "#e8d5c2", fg: "#6e4424" },
    ],
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
  // Illustration scale + backdrop tint — used by EmptyState / Illustration.
  // Three nominal sizes locked here so screens don't drift. Tints map to
  // existing surface tokens; no new colour is introduced.
  illustration: {
    size: { sm: 96, md: 140, lg: 180 },
    tint: {
      sand: "surface.subtle",
      olive: "brand.50",
      sunken: "surface.sunken",
    },
  },
  // Named breakpoints (px). The web app collapses 3-col → 2-col → 1-col
  // along these. Right rail is XL-only.
  breakpoint: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  // Numeral direction for LTR numbers inside RTL text
  numeralDirection: "ltr",

  // ── Warm-dark theme ──────────────────────────────────────────────────────
  // Designed in the Baydar Mobile Kit (May 2026). Warm charcoal, NOT pure black;
  // olive brand + terracotta accent identity preserved. LIGHT IS THE DEFAULT —
  // dark is opt-in (web: `.dark` / `[data-theme="dark"]`; native:
  // `getNativeTokens("dark")`). Only the tokens that change are listed here;
  // every other token inherits its light value above.
  dark: {
    color: {
      // brand-300/400/500/800/900 keep their light values (unused at dark depth).
      brand: { 50: "#262a1b", 100: "#39431f", 200: "#52612e", 600: "#7e9442", 700: "#9bb059" },
      // accent-500 keeps its light value.
      accent: { 50: "#3a241c", 100: "#4a2c20", 600: "#cf6743", 700: "#b5532f" },
      ink: { DEFAULT: "#f1efe8", muted: "#b3afa4", subtle: "#85827a", inverse: "#1a1a17" },
      surface: { DEFAULT: "#232220", muted: "#1a1916", subtle: "#2d2b27", sunken: "#37342f" },
      line: { soft: "rgba(255, 255, 255, 0.08)", hard: "rgba(255, 255, 255, 0.17)" },
      semantic: {
        // success + danger re-lit for the dark surface; soft/border re-derived.
        // warning + info keep their light values (legible on warm charcoal).
        success: "#6fae5f",
        successSoft: "rgba(111, 174, 95, 0.14)",
        successBorder: "rgba(111, 174, 95, 0.30)",
        danger: "#d96b6b",
        dangerSoft: "rgba(217, 107, 107, 0.14)",
        dangerBorder: "rgba(217, 107, 107, 0.30)",
        scrim: "rgba(0, 0, 0, 0.50)",
      },
    },
    shadow: {
      // Pure-black shadows on a dark surface (the warm-ink shadows vanish).
      card: "0 1px 2px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.42)",
      pop: "0 10px 28px rgba(0,0,0,0.50)",
      nav: "0 1px 0 rgba(0,0,0,0.40)",
      modal: "0 24px 60px rgba(0,0,0,0.60), 0 4px 12px rgba(0,0,0,0.40)",
    },
    // Avatar chips stay tinted, but fg refs must resolve LIGHT-on-dark: palette
    // 1 & 4 move their fg to brand-700 (light olive at dark depth); 2 → accent-600.
    // Palette 5 stays a literal light sand chip (same as light theme).
    avatar: {
      palette: [
        { bg: "brand.100", fg: "brand.700" },
        { bg: "accent.100", fg: "accent.600" },
        { bg: "surface.sunken", fg: "ink.DEFAULT" },
        { bg: "brand.200", fg: "brand.700" },
        { bg: "#e8d5c2", fg: "#6e4424" },
      ],
    },
  },
} as const;

export type Tokens = typeof tokens;
export default tokens;
