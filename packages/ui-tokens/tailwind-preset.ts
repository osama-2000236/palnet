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
        micro: [
          `${tokens.type.scale.micro.size}px`,
          { lineHeight: `${tokens.type.scale.micro.line}` },
        ],
        nav: [`${tokens.type.scale.nav.size}px`, { lineHeight: `${tokens.type.scale.nav.line}` }],
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
      spacing: {
        ...Object.fromEntries(Object.entries(tokens.space).map(([k, v]) => [k, `${v}px`])),
        badge: `${tokens.component.badge.compact}px`,
        composer: `${tokens.layout.composerMinHeight}px`,
        coverLetter: `${tokens.layout.coverLetterMinHeight}px`,
        media: `${tokens.layout.mediaMaxHeight}px`,
        "avatar-dot-xs": `${tokens.component.avatarDot.xs}px`,
        "avatar-dot-sm": `${tokens.component.avatarDot.sm}px`,
        "avatar-dot-md": `${tokens.component.avatarDot.md}px`,
        "avatar-dot-lg": `${tokens.component.avatarDot.lg}px`,
        "avatar-dot-xl": `${tokens.component.avatarDot.xl}px`,
      },
      maxWidth: {
        chrome: `${tokens.chrome.maxContentWidth}px`,
        content: `${tokens.layout.contentWidth}px`,
        admin: `${tokens.layout.adminWidth}px`,
        dialog: `${tokens.layout.dialogWidth}px`,
        detail: `${tokens.layout.detailWidth}px`,
        legal: `${tokens.layout.legalWidth}px`,
        profile: `${tokens.layout.profileWidth}px`,
        search: `${tokens.layout.searchWidth}px`,
        sheet: `${tokens.layout.sheetWidth}px`,
      },
      minWidth: {
        badge: `${tokens.component.badge.compact}px`,
        menu: `${tokens.layout.menuMinWidth}px`,
        navItem: `${tokens.layout.navItemMinWidth}px`,
        unread: `${tokens.component.badge.unreadMinWidth}px`,
      },
      borderWidth: {
        3: `${tokens.component.border.emphasized}px`,
      },
      gridTemplateColumns: {
        messages: `${tokens.layout.searchWidth}px minmax(0, 1fr)`,
      },
    },
  },
};

export default preset;
