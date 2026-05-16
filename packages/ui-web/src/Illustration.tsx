// Illustration — 8 motifs × 3 direction kits, used by EmptyState and any
// screen that needs a per-motif graphic without inventing a new SVG. Lifted
// from the Design Pass 1 spec (component-changes.md) so motifs stay in sync
// with the design system.
//
// Stroke weight, palette, and viewBox match the design-pass output exactly —
// fills are tokenised, no raw hex.

import type { JSX } from "react";

import { cx } from "./cx";

export const ILLUSTRATION_MOTIFS = [
  "feed",
  "network",
  "messages",
  "notifications",
  "search",
  "jobs",
  "onboarding",
  "settings",
] as const;
export type IllustrationMotif = (typeof ILLUSTRATION_MOTIFS)[number];

export const ILLUSTRATION_DIRECTIONS = ["outline", "block", "harvest"] as const;
export type IllustrationDirection = (typeof ILLUSTRATION_DIRECTIONS)[number];

export type IllustrationSize = "sm" | "md" | "lg";
export type IllustrationTint = "none" | "sand" | "olive" | "sunken";

export interface IllustrationProps {
  motif: IllustrationMotif;
  direction?: IllustrationDirection;
  size?: IllustrationSize;
  tint?: IllustrationTint;
  className?: string;
}

const SIZE_PX: Record<IllustrationSize, number> = { sm: 96, md: 140, lg: 180 };
const VB_W = 140;
const VB_H = 100;

const TINT_BG: Record<IllustrationTint, string> = {
  none: "transparent",
  sand: "var(--illus-tint-sand)",
  olive: "var(--illus-tint-olive)",
  sunken: "var(--illus-tint-sunken)",
};

export function Illustration({
  motif,
  direction = "harvest",
  size = "md",
  tint = "sand",
  className,
}: IllustrationProps): JSX.Element {
  const px = SIZE_PX[size];
  const h = Math.round((px * VB_H) / VB_W);
  return (
    <div
      aria-hidden="true"
      className={cx(
        "inline-flex shrink-0 items-center justify-center",
        tint !== "none" && "rounded-lg",
        className,
      )}
      style={{ width: px, height: h, background: TINT_BG[tint] }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} role="presentation">
        {direction === "outline" ? <OutlineSet motif={motif} /> : null}
        {direction === "block" ? <BlockSet motif={motif} /> : null}
        {direction === "harvest" ? <HarvestSet motif={motif} /> : null}
      </svg>
    </div>
  );
}

function OutlineSet({ motif }: { motif: IllustrationMotif }): JSX.Element | null {
  const stroke = "var(--brand-700)";
  const accent = "var(--accent-600)";
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (motif) {
    case "feed":
      return (
        <g {...common}>
          <rect x="32" y="28" width="76" height="22" rx="4" />
          <rect x="38" y="54" width="64" height="22" rx="4" />
          <line x1="42" y1="38" x2="86" y2="38" stroke={accent} strokeWidth="2" />
          <line x1="48" y1="64" x2="80" y2="64" />
        </g>
      );
    case "network":
      return (
        <g {...common}>
          <circle cx="48" cy="50" r="14" />
          <circle cx="92" cy="50" r="14" />
          <line x1="62" y1="50" x2="78" y2="50" stroke={accent} strokeWidth="2" />
          <path d="M40 78 q8 -8 16 0" />
          <path d="M84 78 q8 -8 16 0" />
        </g>
      );
    case "messages":
      return (
        <g {...common}>
          <path d="M30 38 q0 -10 10 -10 h44 q10 0 10 10 v12 q0 10 -10 10 h-22 l-10 8 v-8 h-12 q-10 0 -10 -10 z" />
          <path
            d="M70 60 q0 -10 10 -10 h22 q10 0 10 10 v8 q0 10 -10 10 h-14 l-8 6 v-6 q-10 0 -10 -10 z"
            stroke={accent}
            strokeWidth="2"
          />
        </g>
      );
    case "notifications":
      return (
        <g {...common}>
          <path d="M58 30 a12 12 0 0 1 24 0 v18 q0 8 6 12 h-36 q6 -4 6 -12 z" />
          <path d="M64 72 q3 6 6 6 q3 0 6 -6" />
          <circle cx="86" cy="32" r="5" fill={accent} stroke="none" />
        </g>
      );
    case "search":
      return (
        <g {...common}>
          <circle cx="62" cy="48" r="18" />
          <line x1="76" y1="62" x2="92" y2="78" />
          <line x1="54" y1="48" x2="70" y2="48" stroke={accent} strokeWidth="2" />
        </g>
      );
    case "jobs":
      return (
        <g {...common}>
          <rect x="36" y="38" width="68" height="42" rx="4" />
          <path d="M58 38 v-6 q0 -4 4 -4 h16 q4 0 4 4 v6" />
          <line x1="36" y1="56" x2="104" y2="56" />
          <circle cx="70" cy="56" r="3" fill={accent} stroke="none" />
        </g>
      );
    case "onboarding":
      return (
        <g {...common}>
          <circle cx="70" cy="44" r="11" />
          <path d="M52 80 q0 -16 18 -16 q18 0 18 16" />
          <path d="M88 30 l8 4 l-8 4" stroke={accent} strokeWidth="2" />
        </g>
      );
    case "settings":
      return (
        <g {...common}>
          <path d="M70 26 l22 8 v18 q0 16 -22 26 q-22 -10 -22 -26 v-18 z" />
          <path d="M60 52 l8 8 l16 -16" stroke={accent} strokeWidth="2" />
        </g>
      );
    default:
      return null;
  }
}

function BlockSet({ motif }: { motif: IllustrationMotif }): JSX.Element | null {
  const tint1 = "var(--brand-100)";
  const tint2 = "var(--brand-200)";
  const ink = "var(--brand-700)";
  const accent = "var(--accent-600)";
  switch (motif) {
    case "feed":
      return (
        <g>
          <rect x="28" y="22" width="84" height="24" rx="4" fill={tint1} />
          <rect x="28" y="50" width="62" height="24" rx="4" fill={tint2} />
          <rect x="34" y="30" width="40" height="3" rx="1.5" fill={ink} />
          <rect x="34" y="38" width="22" height="3" rx="1.5" fill={accent} />
          <rect x="34" y="58" width="34" height="3" rx="1.5" fill={ink} />
          <rect x="34" y="66" width="14" height="3" rx="1.5" fill={ink} opacity=".5" />
        </g>
      );
    case "network":
      return (
        <g>
          <circle cx="46" cy="50" r="16" fill={tint2} />
          <circle cx="94" cy="50" r="16" fill={tint1} />
          <rect x="60" y="46" width="20" height="8" rx="3" fill={accent} />
        </g>
      );
    case "messages":
      return (
        <g>
          <rect x="26" y="30" width="60" height="28" rx="14" fill={tint2} />
          <rect x="58" y="56" width="56" height="24" rx="12" fill={tint1} />
          <circle cx="42" cy="44" r="2.5" fill={ink} />
          <circle cx="54" cy="44" r="2.5" fill={ink} />
          <circle cx="66" cy="44" r="2.5" fill={accent} />
        </g>
      );
    case "notifications":
      return (
        <g>
          <rect x="50" y="28" width="40" height="44" rx="20" fill={tint1} />
          <rect x="58" y="48" width="24" height="3" rx="1.5" fill={ink} />
          <rect x="58" y="56" width="14" height="3" rx="1.5" fill={ink} opacity=".55" />
          <circle cx="88" cy="32" r="6" fill={accent} />
        </g>
      );
    case "search":
      return (
        <g>
          <rect x="34" y="36" width="56" height="32" rx="16" fill={tint1} />
          <rect x="42" y="48" width="34" height="3" rx="1.5" fill={ink} />
          <rect x="42" y="56" width="20" height="3" rx="1.5" fill={ink} opacity=".5" />
          <rect
            x="86"
            y="62"
            width="16"
            height="6"
            rx="3"
            fill={accent}
            transform="rotate(38 94 65)"
          />
        </g>
      );
    case "jobs":
      return (
        <g>
          <rect x="32" y="38" width="72" height="42" rx="4" fill={tint2} />
          <rect x="58" y="30" width="20" height="10" rx="2" fill={tint1} />
          <rect x="32" y="54" width="72" height="2" fill={ink} opacity=".4" />
          <rect x="64" y="50" width="8" height="8" rx="2" fill={accent} />
        </g>
      );
    case "onboarding":
      return (
        <g>
          <circle cx="70" cy="42" r="14" fill={tint1} />
          <rect x="48" y="60" width="44" height="22" rx="10" fill={tint2} />
          <rect x="62" y="68" width="16" height="3" rx="1.5" fill={ink} />
          <rect x="62" y="75" width="10" height="3" rx="1.5" fill={accent} />
        </g>
      );
    case "settings":
      return (
        <g>
          <path d="M70 22 L98 36 V58 Q98 78 70 86 Q42 78 42 58 V36 Z" fill={tint1} />
          <rect x="58" y="50" width="24" height="14" rx="3" fill={ink} />
          <rect x="66" y="44" width="8" height="10" rx="2" fill={accent} />
        </g>
      );
    default:
      return null;
  }
}

function HarvestSet({ motif }: { motif: IllustrationMotif }): JSX.Element {
  const olive = "var(--brand-600)";
  const cream = "var(--surface-muted)";
  const ink = "var(--brand-800)";
  const accent = "var(--accent-600)";

  const baseline = (
    <g>
      <line x1="20" y1="84" x2="120" y2="84" stroke={olive} strokeWidth="0.8" opacity=".4" />
      <circle cx="70" cy="60" r="34" fill={olive} opacity="0.08" />
      <circle cx="70" cy="60" r="34" fill="none" stroke={olive} strokeWidth="1" opacity=".5" />
    </g>
  );
  const wheat = (
    <g stroke={olive} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".55">
      <path d="M30 82 q-2 -14 4 -22" />
      <path d="M32 76 l-3 -2 M32 72 l-3 -2 M32 68 l-3 -2 M34 64 l-3 -2" />
      <path d="M110 82 q2 -14 -4 -22" />
      <path d="M108 76 l3 -2 M108 72 l3 -2 M108 68 l3 -2 M106 64 l3 -2" />
    </g>
  );

  let symbol: JSX.Element | null = null;
  switch (motif) {
    case "feed":
      symbol = (
        <g fill={ink}>
          <rect x="54" y="48" width="32" height="6" rx="2" />
          <rect x="54" y="58" width="32" height="6" rx="2" fill={olive} />
          <rect x="54" y="68" width="20" height="6" rx="2" fill={accent} />
        </g>
      );
      break;
    case "network":
      symbol = (
        <g>
          <circle cx="58" cy="60" r="8" fill={ink} />
          <circle cx="82" cy="60" r="8" fill={olive} />
          <line x1="64" y1="60" x2="76" y2="60" stroke={accent} strokeWidth="2.2" />
        </g>
      );
      break;
    case "messages":
      symbol = (
        <g fill={ink}>
          <path d="M50 56 q0 -6 6 -6 h22 q6 0 6 6 v6 q0 6 -6 6 h-12 l-6 4 v-4 h-4 q-6 0 -6 -6 z" />
          <path
            d="M72 64 q0 -5 5 -5 h12 q5 0 5 5 v5 q0 5 -5 5 h-7 l-5 3 v-3 q-5 0 -5 -5 z"
            fill={olive}
          />
        </g>
      );
      break;
    case "notifications":
      symbol = (
        <g fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 50 a10 10 0 0 1 20 0 v12 q0 6 4 8 h-28 q4 -2 4 -8 z" />
          <path d="M66 72 q4 6 8 0" />
          <circle cx="84" cy="50" r="4" fill={accent} stroke="none" />
        </g>
      );
      break;
    case "search":
      symbol = (
        <g fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round">
          <circle cx="66" cy="56" r="11" />
          <line x1="74" y1="64" x2="84" y2="74" />
          <circle cx="66" cy="56" r="3" fill={accent} stroke="none" />
        </g>
      );
      break;
    case "jobs":
      symbol = (
        <g>
          <rect x="50" y="52" width="40" height="22" rx="3" fill={ink} />
          <rect x="60" y="46" width="20" height="8" rx="2" fill={ink} />
          <rect x="50" y="60" width="40" height="2" fill={cream} />
          <rect x="66" y="58" width="8" height="6" rx="1.5" fill={accent} />
        </g>
      );
      break;
    case "onboarding":
      symbol = (
        <g>
          <circle cx="70" cy="54" r="9" fill={ink} />
          <path
            d="M58 74 q0 -8 12 -8 q12 0 12 8"
            stroke={ink}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M82 50 l5 2 l-5 2"
            stroke={accent}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
      break;
    case "settings":
      symbol = (
        <g>
          <path d="M70 44 L86 50 V62 Q86 73 70 78 Q54 73 54 62 V50 Z" fill={ink} />
          <path
            d="M62 60 l5 5 l11 -11"
            stroke={cream}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
      break;
  }

  return (
    <g>
      {baseline}
      {wheat}
      {symbol}
    </g>
  );
}
