// Icon — the single source of SVG glyphs used across Baydar's web UI.
// Lifted from docs/design/prototype/components/primitives.jsx (Icon).
//
// Rules:
//   • One shape per name — variants (filled/outline, sizes) are applied via
//     the `size` and the consumer's text color (`currentColor`).
//   • Never pass raw hex — icons inherit color from the parent via
//     `stroke="currentColor"`, so set `text-*` on the wrapper instead.
//   • `aria-hidden="true"` by default — icons are decorative. Pair with a
//     visible label or `aria-label` on the interactive parent.
//   • The `logo` glyph is intentionally a placeholder mark. Replace with the
//     final Baydar wheat mark before launch (HANDOFF.md).
//
// Adding an icon: drop a new `case` that returns an <svg> on the shared 24×24
// viewBox with a 1.8-width stroke. Keep the file alphabetical within sections.

import type { SVGProps } from "react";

export type IconName =
  | "bell"
  | "bookmark"
  | "briefcase"
  | "calendar"
  | "check"
  | "check-double"
  | "chevron-down"
  | "clock"
  | "comment"
  | "home"
  | "image"
  | "logo"
  | "message"
  | "more"
  | "plus"
  | "repost"
  | "search"
  | "send"
  | "send-paper"
  | "thumb"
  | "users"
  | "video"
  | "x"
  | "settings"
  | "log-out"
  | "flag"
  | "shield-off";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  title?: string;
}

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
  title,
  ...rest
}: IconProps): JSX.Element | null {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": title ? undefined : true,
    role: title ? "img" : undefined,
    ...rest,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M3 11 12 4l9 7" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="9" cy="9" r="3.5" />
          <path d="M2.5 20c0-3 3-5 6.5-5s6.5 2 6.5 5" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M21.5 19c0-2-1.5-3.5-4-4" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </svg>
      );
    case "message":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M4 5h16v12H8l-4 4z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m3 18 6-5 5 4 3-2 4 3" />
        </svg>
      );
    case "video":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="m16 10 5-3v10l-5-3z" />
        </svg>
      );
    case "thumb":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.5 2.5V10h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7" />
        </svg>
      );
    case "comment":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M4 5h16v12H8l-4 4z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "repost":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M4 8h12l-3-3M20 16H8l3 3" />
        </svg>
      );
    case "send":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="m21 3-9 18-2-8-8-2z" />
        </svg>
      );
    case "send-paper":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M21 12 3 4l3 8-3 8z" />
          <path d="M6 12h15" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="m5 12 5 5L20 7" />
        </svg>
      );
    case "check-double":
      // Two overlapping ticks — WhatsApp-style delivered / read indicator.
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="m3 12 4 4L15 7" />
          <path d="m10 16 1 1L22 7" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="5" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="19" cy="12" r="1.4" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M6 4h12v17l-6-4-6 4z" />
        </svg>
      );
    case "logo":
      // Placeholder Baydar mark — rounded brand-600 square with an outlined
      // "بي" shape. Replace with the final wheat mark before launch.
      // Colors come from tokens: the wrapper sets `text-ink-inverse` so the
      // inner strokes inherit via `currentColor`; the rect fills via
      // `fill-brand-600`. Never hardcode hex here.
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden={title ? undefined : true}
          role={title ? "img" : undefined}
          className="text-ink-inverse"
          {...rest}
        >
          {title ? <title>{title}</title> : null}
          <rect x="2" y="2" width="20" height="20" rx="5" className="fill-brand-600" />
          <path
            d="M7 17V7M7 12c3 0 5-1.5 5-4s-2-3-4-3M12 17l5-10M14 17h3"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "settings":
      // Gear: eight-tooth silhouette + center dot. Kept simple to read at
      // Compact alongside other header glyphs.
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    case "log-out":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M4 22V4" />
          <path d="M4 4h13l-2 4 2 4H4" />
        </svg>
      );
    case "shield-off":
      // Block / unblock glyph — shield with a slash.
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M19.7 14A9 9 0 0 0 20 10V5l-8-3-3.5 1.3" />
          <path d="M4.7 4.7 4 5v5a9 9 0 0 0 8 9 9 9 0 0 0 2.7-.4" />
          <path d="M2 2l20 20" />
        </svg>
      );
    default:
      return null;
  }
}
