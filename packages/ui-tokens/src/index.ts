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
    // The olive app band. Every screen's chrome sits on this. Separated from
    // the paper below by colour, never elevation — see AppBand.
    band: {
      DEFAULT: "#526030", // = brand.600
      on: "#f4f6ef", // text/icon on band — 8.9:1
      onMuted: "#e6ebd6", // secondary on band — 4.8:1  (= brand.100)
      hairline: "rgba(255, 255, 255, 0.30)",
    },
    // Ink = foreground text. Warmer than slate.
    ink: {
      DEFAULT: "#1a1a17",
      muted: "#5c5a52",
      // A6: was #8a8880 — 3.55:1 on --surface and 3.08:1 on --surface-subtle,
      // and it carries input placeholders, disabled text and field icons. Now
      // 5.20 / 4.51. Re-lit against the *worse* of the two backgrounds, which
      // is why it sits closer to `muted` than the old ramp did.
      subtle: "#6e6d66",
      inverse: "#ffffff",
    },
    // Surface = backgrounds. Subtly warm.
    surface: {
      DEFAULT: "#ffffff",
      muted: "#faf9f5",
      subtle: "#f1efe7",
      sunken: "#ebe8dc",
      // Sixth variant: a tinted FULL-BLEED section, not a card. The alternating
      // band in the feed/jobs column. Same value as `subtle` in light; they
      // diverge in dark, which is the whole reason it is its own key.
      band: "#f1efe7",
    },
    line: {
      soft: "rgba(26, 26, 23, 0.08)",
      hard: "rgba(26, 26, 23, 0.16)",
    },
    // The one numeric device (ScoreBar / StepRail). Never red: a low value is a
    // fact, not an error — see MATCHING.md §1.
    bar: {
      track: "#e0dcce",
      fill: "#526030", // = brand.600
      fillWeak: "#a9b878", // sub-50% values (= brand.300)
      onBandTrack: "rgba(244, 246, 239, 0.22)",
      onBandFill: "#e6ebd6", // = brand.100
    },
    // Section rules — TWO weights, no third.
    rule: {
      hairline: "rgba(26, 26, 23, 0.08)",
      strong: "rgba(26, 26, 23, 0.16)",
    },
    semantic: {
      success: "#3b7a3b",
      successSoft: "rgba(59, 122, 59, 0.10)",
      successBorder: "rgba(59, 122, 59, 0.22)",
      // Was #926516: 4.50 on its tint over white, 3.87 over `sunken`. HANDOFF §semantics.
      warning: "#7e5713",
      warningSoft: "rgba(126, 87, 19, 0.10)",
      warningBorder: "rgba(126, 87, 19, 0.25)",
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
      // The eighth step. The seven-step scale stopped at 12, so every piece of
      // dense chrome that needed to go smaller — nav labels, `sm` chips, count
      // badges, message meta, section overlines — invented its own size:
      // `text-[11px]` appeared 28 times, `text-[10px]` three more, alongside
      // `text-[13.5px]` and `text-[14px]`. Naming the step is what stops the
      // invention; `micro` is the floor, and nothing may go below it.
      // Line height is deliberately tighter than every other step. `micro` is
      // the dense-chrome step — nav labels, count badges, timestamps, overlines
      // — and it lives inside fixed-height chrome. At 1.45 the AppShell profile
      // label clipped against the 56px nav bar the first time this shipped.
      micro: { size: 11, weight: 500, line: 1.2, track: "0.01em" },
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
  // Stacking order. Before this existed each layer picked its own z-index
  // (`z-[1000]` on Dialog, `z-[100]` on Toast, `z-20` on AppShell), so whether
  // a toast rose above a modal was undefined. Gaps of 10 leave room to insert.
  z: {
    base: 0,
    sticky: 10,
    nav: 20,
    dropdown: 30,
    sheet: 40,
    modal: 50,
    toast: 60,
    tooltip: 70,
  } as const,
  // Minimum pressable size. `min` is CLAUDE.md's 44pt mobile rule (also WCAG
  // 2.5.5 AAA); `compact` is its 40px web rule. Both are far above WCAG 2.5.8
  // AA's 24px, which is deliberate — the repo holds the higher line.
  target: { min: 44, compact: 40 } as const,
  // State layer — one tokenized ink overlay every interactive surface applies,
  // instead of each variant hand-writing its own hover. Dark needs more because
  // an ink overlay reads weaker on a dark surface.
  state: {
    light: { hover: 0.04, pressed: 0.09, selected: 0.12 },
    dark: { hover: 0.06, pressed: 0.12, selected: 0.16 },
  } as const,
  // Motion
  motion: {
    // `slower` added for sheet and modal entrances: 240ms is right for a
    // colour change and visibly clipped for a surface travelling from an edge.
    duration: { fast: 80, base: 120, slow: 240, slower: 400 },
    // Native spring configs (Reanimated `withSpring`). Web keeps the cubic
    // beziers below — a spring in CSS is a bezier approximation anyway.
    spring: {
      toggle: { stiffness: 420, damping: 32, mass: 0.9 },
      sheet: { stiffness: 260, damping: 30, mass: 1 },
      press: { stiffness: 520, damping: 28, mass: 0.7 },
    },
    easing: {
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      emphasized: "cubic-bezier(0.3, 0, 0, 1.15)",
      spring: "cubic-bezier(0.34, 1.4, 0.5, 1)", // emphasized + overshoot for entrances
    },
    stagger: { step: 40, max: 6 }, // ms between list items; cap at 6 (6×40 = 240ms = --dur-slow)
    enter: { rise: 8 }, // px translateY on entrance (= space[2])
  },
  // Switch thumb. Was a hardcoded `bg-white` on web against `c.inkInverse` on
  // native — the same component, opposite colours per platform, and invisible
  // against the light OFF track either way (1.23:1). One semantic token, plus
  // the border the Switch draws so the thumb and the OFF track both have a
  // perceivable boundary (WCAG 1.4.11 needs 3:1 and no fill in this palette
  // can reach it).
  control: {
    switchThumb: "#ffffff",
    barHeight: 6, // ScoreBar default
    barHeightLarge: 8, // ScoreBar on a band (Karama header)
    railNode: 9, // StepRail node diameter
    railNodeCurrent: 11,
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
    // AppBand: status bar + breathing room. iOS uses this as the floor; Android
    // resolves it against the real inset (see AppBand's `paddingTop` note).
    bandPaddingTop: 62,
    bandPaddingBottom: 14,
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
      // A6: subtle was #85827a — 4.14 / 3.68. Now 5.51 / 4.90.
      ink: { DEFAULT: "#f1efe8", muted: "#b3afa4", subtle: "#9b988f", inverse: "#1a1a17" },
      surface: {
        DEFAULT: "#232220",
        muted: "#1a1916",
        subtle: "#2d2b27",
        sunken: "#37342f",
        // Diverges from `subtle` here — the band reads warmer/deeper so an
        // alternating column still alternates at dark depth.
        band: "#241f1a",
      },
      line: { soft: "rgba(255, 255, 255, 0.08)", hard: "rgba(255, 255, 255, 0.17)" },
      // Olive re-lit at depth, never #000 (design 2d).
      band: {
        DEFAULT: "#3a4423",
        on: "#f4f6ef",
        onMuted: "#ccd6a8",
        hairline: "rgba(255, 255, 255, 0.16)",
      },
      bar: {
        track: "#3a352d",
        fill: "#a9b878",
        fillWeak: "#6b7a45",
        onBandTrack: "rgba(244, 246, 239, 0.18)",
        onBandFill: "#ccd6a8",
      },
      rule: {
        hairline: "rgba(244, 246, 239, 0.10)",
        strong: "rgba(244, 246, 239, 0.18)",
      },
      semantic: {
        // A6: the previous comment here claimed "warning + info read fine as-is"
        // and inherited both from light. Measured, `--info` was 2.61:1 against
        // its own tint and 3.05:1 under the Toast's ink — the two worst pairs in
        // the system. All four semantics now carry a dark value.
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
      },
      // The thumb stays a light pill in both themes so the control reads the
      // same way; the OFF-track boundary is what carries the contrast.
      control: { switchThumb: "#f1efe8" },
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
