// packages/ui-tokens/tailwind-preset.ts
// Drop-in Tailwind preset for apps/web. Extends Tailwind with our tokens.
// Usage in apps/web/tailwind.config.ts:
//   import preset from "@baydar/ui-tokens/tailwind-preset";
//   export default { presets: [preset], content: [...] };

import type { Config } from "tailwindcss";
import { tokens } from "./src/index";

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: tokens.color.brand,
        accent: tokens.color.accent,
        ink: {
          DEFAULT: tokens.color.ink.DEFAULT,
          muted: tokens.color.ink.muted,
          subtle: tokens.color.ink.subtle,
          inverse: tokens.color.ink.inverse,
        },
        surface: {
          DEFAULT: tokens.color.surface.DEFAULT,
          muted: tokens.color.surface.muted,
          subtle: tokens.color.surface.subtle,
          sunken: tokens.color.surface.sunken,
        },
        line: tokens.color.line,
        success: tokens.color.semantic.success,
        warning: tokens.color.semantic.warning,
        danger: tokens.color.semantic.danger,
        info: tokens.color.semantic.info,
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
    },
  },
};

export default preset;
