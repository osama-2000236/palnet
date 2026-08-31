import { tokens } from "./index";

type TailwindPreset = {
  // `dark:` utility variants resolve under `.dark`. The full CSS-var swap (which
  // most tokenized utilities like `bg-surface` ride for free) lives in
  // tokens.css and ALSO honors `[data-theme="dark"]`. Light is the default —
  // dark is opt-in.
  darkMode: "class" | "media" | [string, string | string[]];
  theme: {
    extend: Record<string, unknown>;
  };
};

// Map a token name to its channel-var form so Tailwind utilities support the
// `/<opacity>` modifier AND re-theme under `.dark` (channels are swapped in
// tokens.css). The literal hex in tokens.* stays the canonical value; here we
// only reference the CSS var the build emits.
const v = (name: string): string => `rgb(var(--${name}-rgb) / <alpha-value>)`;
const scale = (prefix: string, keys: readonly (string | number)[]): Record<string, string> =>
  Object.fromEntries(keys.map((k) => [k, v(`${prefix}-${k}`)]));

type FontSizeEntry = [string, { lineHeight: string; letterSpacing?: string }];

const step = (name: keyof typeof tokens.type.scale): FontSizeEntry => {
  const s = tokens.type.scale[name];
  return [
    `${s.size}px`,
    { lineHeight: `${s.line}`, ...(s.track === "0" ? {} : { letterSpacing: s.track }) },
  ];
};

// See the comment at the `...aliases` spread below for why these exist.
const aliases: Record<string, FontSizeEntry> = {
  xs: step("caption"),
  sm: step("small"),
  base: step("body"),
  lg: step("h3"),
  xl: step("h2"),
  "2xl": step("h1"),
  "3xl": step("h1"),
  "4xl": step("display"),
  "5xl": step("display"),
};

const preset: TailwindPreset = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: scale("brand", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        accent: scale("accent", [50, 100, 500, 600, 700]),
        ink: {
          DEFAULT: v("ink"),
          muted: v("ink-muted"),
          subtle: v("ink-subtle"),
          inverse: v("ink-inverse"),
        },
        surface: {
          DEFAULT: v("surface"),
          muted: v("surface-muted"),
          subtle: v("surface-subtle"),
          sunken: v("surface-sunken"),
          band: v("surface-band"),
        },
        // The olive app band. `on`/`onMuted` are its foregrounds.
        band: {
          DEFAULT: v("band"),
          on: v("band-on"),
          "on-muted": v("band-on-muted"),
          hairline: "var(--band-hairline)",
        },
        // The one numeric device (ScoreBar / StepRail). Never red.
        bar: {
          track: v("bar-track"),
          fill: v("bar-fill"),
          "fill-weak": v("bar-fill-weak"),
          "on-band-track": "var(--bar-on-band-track)",
          "on-band-fill": v("bar-on-band-fill"),
        },
        // Section rules — two weights, no third. Translucent, like `line`.
        rule: {
          hairline: "var(--rule-hairline)",
          strong: "var(--rule-strong)",
        },
        // line is translucent (rgba) — no alpha modifier needed; plain var
        // still re-themes in dark.
        line: {
          soft: "var(--line-soft)",
          hard: "var(--line-hard)",
        },
        success: v("success"),
        warning: v("warning"),
        danger: v("danger"),
        info: v("info"),
      },
      borderRadius: {
        xs: `${tokens.radius.xs}px`,
        sm: `${tokens.radius.sm}px`,
        md: `${tokens.radius.md}px`,
        lg: `${tokens.radius.lg}px`,
        xl: `${tokens.radius.xl}px`,
      },
      boxShadow: {
        card: tokens.shadow.card,
        pop: tokens.shadow.pop,
        nav: tokens.shadow.nav,
        modal: tokens.shadow.modal,
      },
      fontFamily: {
        sans: [tokens.type.family.sans],
        body: [tokens.type.family.body],
        mono: [tokens.type.family.mono],
      },
      fontSize: {
        display: [
          `${tokens.type.scale.display.size}px`,
          {
            lineHeight: `${tokens.type.scale.display.line}`,
            letterSpacing: tokens.type.scale.display.track,
          },
        ],
        h1: [
          `${tokens.type.scale.h1.size}px`,
          { lineHeight: `${tokens.type.scale.h1.line}`, letterSpacing: tokens.type.scale.h1.track },
        ],
        h2: [`${tokens.type.scale.h2.size}px`, { lineHeight: `${tokens.type.scale.h2.line}` }],
        h3: [`${tokens.type.scale.h3.size}px`, { lineHeight: `${tokens.type.scale.h3.line}` }],
        body: [
          `${tokens.type.scale.body.size}px`,
          { lineHeight: `${tokens.type.scale.body.line}` },
        ],
        small: [
          `${tokens.type.scale.small.size}px`,
          { lineHeight: `${tokens.type.scale.small.line}` },
        ],
        caption: [
          `${tokens.type.scale.caption.size}px`,
          {
            lineHeight: `${tokens.type.scale.caption.line}`,
            letterSpacing: tokens.type.scale.caption.track,
          },
        ],
        micro: [
          `${tokens.type.scale.micro.size}px`,
          {
            lineHeight: `${tokens.type.scale.micro.line}`,
            letterSpacing: tokens.type.scale.micro.track,
          },
        ],
        // Tailwind's own t-shirt keys, re-pointed at Baydar's steps.
        //
        // DESIGN.md §5.2 documents a seven-step scale. The product did not use
        // it: a count across `apps/web/src` + `packages/ui-web/src` found the
        // semantic utilities used **3 times** against ~530 uses of Tailwind's
        // default scale in 94 files. Every page title rendered at 30px against
        // a spec of 26; body copy at 14 against 15; the landing hero at 48
        // against a display step of 36. The documented scale was fiction.
        //
        // Re-pointing the aliases fixes all 530 call sites at once and makes
        // the off-scale size unreachable — you cannot land between two steps
        // even by accident. Two aliases collapsing onto one step (2xl/3xl →
        // h1, 4xl/5xl → display) is the scale doing its job, not a loss.
        ...aliases,
      },
      spacing: {
        ...Object.fromEntries(Object.entries(tokens.space).map(([k, v]) => [k, `${v}px`])),
        // `min-h-target` / `min-w-target` — the pressable minimum, so no
        // component has to remember whether that is 44 or 40.
        target: `${tokens.target.min}px`,
        "target-compact": `${tokens.target.compact}px`,
      },
      zIndex: Object.fromEntries(Object.entries(tokens.z).map(([k, v]) => [k, `${v}`])),
      opacity: {
        "state-hover": `${tokens.state.light.hover}`,
        "state-pressed": `${tokens.state.light.pressed}`,
        "state-selected": `${tokens.state.light.selected}`,
      },
      transitionDuration: {
        fast: `${tokens.motion.duration.fast}ms`,
        base: `${tokens.motion.duration.base}ms`,
        slow: `${tokens.motion.duration.slow}ms`,
        slower: `${tokens.motion.duration.slower}ms`,
      },
      transitionTimingFunction: {
        standard: tokens.motion.easing.standard,
        emphasized: tokens.motion.easing.emphasized,
        spring: tokens.motion.easing.spring,
      },
      keyframes: {
        "enter-up": {
          from: { opacity: "0", transform: `translateY(${tokens.motion.enter.rise}px)` },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "enter-up": `enter-up ${tokens.motion.duration.slow}ms ${tokens.motion.easing.emphasized} both`,
      },
    },
  },
};

export default preset;
