import type { JSX } from "react";

import type { IllustrationMotif } from "./Illustration";

export function HarvestSet({ motif }: { motif: IllustrationMotif }): JSX.Element {
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
    case "saved":
      symbol = (
        <g>
          <path d="M58 47 q0 -3 3 -3 h18 q3 0 3 3 v29 l-12 -8 l-12 8 z" fill={ink} />
          <path
            d="M64 55 l4 4 l9 -9"
            stroke={cream}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
      break;
    case "error":
      symbol = (
        <g>
          <circle cx="70" cy="60" r="14" fill={ink} />
          <rect x="68" y="52" width="4" height="10" rx="2" fill={cream} />
          <circle cx="70" cy="68" r="2.5" fill={accent} />
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
