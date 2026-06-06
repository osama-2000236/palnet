import type { JSX } from "react";
import { Circle, G, Line, Path, Rect } from "react-native-svg";

import type { IllustrationMotif } from "./Illustration";
import { nativeTokens } from "./tokens";

const c = nativeTokens.color;

export function HarvestSet({ motif }: { motif: IllustrationMotif }): JSX.Element {
  const olive = c.brand600;
  const cream = c.surfaceMuted;
  const ink = c.brand800;
  const accent = c.accent600;

  const baseline = (
    <G>
      <Line x1="20" y1="84" x2="120" y2="84" stroke={olive} strokeWidth={0.8} opacity={0.4} />
      <Circle cx="70" cy="60" r="34" fill={olive} opacity={0.08} />
      <Circle cx="70" cy="60" r="34" fill="none" stroke={olive} strokeWidth={1} opacity={0.5} />
    </G>
  );
  const wheat = (
    <G stroke={olive} strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.55}>
      <Path d="M30 82 q-2 -14 4 -22" />
      <Path d="M32 76 l-3 -2 M32 72 l-3 -2 M32 68 l-3 -2 M34 64 l-3 -2" />
      <Path d="M110 82 q2 -14 -4 -22" />
      <Path d="M108 76 l3 -2 M108 72 l3 -2 M108 68 l3 -2 M106 64 l3 -2" />
    </G>
  );

  let symbol: JSX.Element | null = null;
  switch (motif) {
    case "feed":
      symbol = (
        <G fill={ink}>
          <Rect x="54" y="48" width="32" height="6" rx="2" />
          <Rect x="54" y="58" width="32" height="6" rx="2" fill={olive} />
          <Rect x="54" y="68" width="20" height="6" rx="2" fill={accent} />
        </G>
      );
      break;
    case "network":
      symbol = (
        <G>
          <Circle cx="58" cy="60" r="8" fill={ink} />
          <Circle cx="82" cy="60" r="8" fill={olive} />
          <Line x1="64" y1="60" x2="76" y2="60" stroke={accent} strokeWidth={2.2} />
        </G>
      );
      break;
    case "messages":
      symbol = (
        <G fill={ink}>
          <Path d="M50 56 q0 -6 6 -6 h22 q6 0 6 6 v6 q0 6 -6 6 h-12 l-6 4 v-4 h-4 q-6 0 -6 -6 z" />
          <Path
            d="M72 64 q0 -5 5 -5 h12 q5 0 5 5 v5 q0 5 -5 5 h-7 l-5 3 v-3 q-5 0 -5 -5 z"
            fill={olive}
          />
        </G>
      );
      break;
    case "notifications":
      symbol = (
        <G fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M60 50 a10 10 0 0 1 20 0 v12 q0 6 4 8 h-28 q4 -2 4 -8 z" />
          <Path d="M66 72 q4 6 8 0" />
          <Circle cx="84" cy="50" r="4" fill={accent} stroke="none" />
        </G>
      );
      break;
    case "search":
      symbol = (
        <G fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round">
          <Circle cx="66" cy="56" r="11" />
          <Line x1="74" y1="64" x2="84" y2="74" />
          <Circle cx="66" cy="56" r="3" fill={accent} stroke="none" />
        </G>
      );
      break;
    case "jobs":
      symbol = (
        <G>
          <Rect x="50" y="52" width="40" height="22" rx="3" fill={ink} />
          <Rect x="60" y="46" width="20" height="8" rx="2" fill={ink} />
          <Rect x="50" y="60" width="40" height="2" fill={cream} />
          <Rect x="66" y="58" width="8" height="6" rx="1.5" fill={accent} />
        </G>
      );
      break;
    case "onboarding":
      symbol = (
        <G>
          <Circle cx="70" cy="54" r="9" fill={ink} />
          <Path
            d="M58 74 q0 -8 12 -8 q12 0 12 8"
            stroke={ink}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M82 50 l5 2 l-5 2"
            stroke={accent}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      );
      break;
    case "settings":
      symbol = (
        <G>
          <Path d="M70 44 L86 50 V62 Q86 73 70 78 Q54 73 54 62 V50 Z" fill={ink} />
          <Path
            d="M62 60 l5 5 l11 -11"
            stroke={cream}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      );
      break;
  }

  return (
    <G>
      {baseline}
      {wheat}
      {symbol}
    </G>
  );
}
