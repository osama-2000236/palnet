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
      },
      spacing: Object.fromEntries(Object.entries(tokens.space).map(([k, v]) => [k, `${v}px`])),
      transitionDuration: {
        fast: `${tokens.motion.duration.fast}ms`,
        base: `${tokens.motion.duration.base}ms`,
        slow: `${tokens.motion.duration.slow}ms`,
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
