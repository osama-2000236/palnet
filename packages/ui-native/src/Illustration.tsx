// Illustration — native twin of packages/ui-web/src/Illustration.tsx.
// 8 motifs × 3 directions, drawn via react-native-svg. Same viewBox + paths
// + colour tokens as the web kit; sizes resolve to nativeTokens.illustration.size.

import { View, type StyleProp, type ViewStyle } from "react-native";
import { Circle, G, Line, Path, Rect, Svg } from "react-native-svg";

import { nativeTokens } from "./tokens";

export const ILLUSTRATION_MOTIFS = [
  "feed",
  "network",
  "messages",
  "notifications",
  "search",
  "jobs",
  "onboarding",
  "settings",
  "saved",
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
  style?: StyleProp<ViewStyle>;
}

const VB_W = 140;
const VB_H = 100;

const TINT_BG: Record<IllustrationTint, string> = {
  none: "transparent",
  sand: nativeTokens.color.surfaceSubtle,
  olive: nativeTokens.color.brand50,
  sunken: nativeTokens.color.surfaceSunken,
};

const c = nativeTokens.color;

export function Illustration({
  motif,
  direction = "harvest",
  size = "md",
  tint = "sand",
  style,
}: IllustrationProps): JSX.Element {
  const px = nativeTokens.illustration.size[size];
  const h = Math.round((px * VB_H) / VB_W);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: px,
          height: h,
          backgroundColor: TINT_BG[tint],
          borderRadius: tint === "none" ? 0 : nativeTokens.radius.lg,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`}>
        {direction === "outline" ? <OutlineSet motif={motif} /> : null}
        {direction === "block" ? <BlockSet motif={motif} /> : null}
        {direction === "harvest" ? <HarvestSet motif={motif} /> : null}
      </Svg>
    </View>
  );
}

function OutlineSet({ motif }: { motif: IllustrationMotif }): JSX.Element | null {
  const stroke = c.brand700;
  const accent = c.accent600;
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
        <G {...common}>
          <Rect x="32" y="28" width="76" height="22" rx="4" />
          <Rect x="38" y="54" width="64" height="22" rx="4" />
          <Line x1="42" y1="38" x2="86" y2="38" stroke={accent} strokeWidth={2} />
          <Line x1="48" y1="64" x2="80" y2="64" />
        </G>
      );
    case "network":
      return (
        <G {...common}>
          <Circle cx="48" cy="50" r="14" />
          <Circle cx="92" cy="50" r="14" />
          <Line x1="62" y1="50" x2="78" y2="50" stroke={accent} strokeWidth={2} />
          <Path d="M40 78 q8 -8 16 0" />
          <Path d="M84 78 q8 -8 16 0" />
        </G>
      );
    case "messages":
      return (
        <G {...common}>
          <Path d="M30 38 q0 -10 10 -10 h44 q10 0 10 10 v12 q0 10 -10 10 h-22 l-10 8 v-8 h-12 q-10 0 -10 -10 z" />
          <Path
            d="M70 60 q0 -10 10 -10 h22 q10 0 10 10 v8 q0 10 -10 10 h-14 l-8 6 v-6 q-10 0 -10 -10 z"
            stroke={accent}
            strokeWidth={2}
          />
        </G>
      );
    case "notifications":
      return (
        <G
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M58 30 a12 12 0 0 1 24 0 v18 q0 8 6 12 h-36 q6 -4 6 -12 z" />
          <Path d="M64 72 q3 6 6 6 q3 0 6 -6" />
          <Circle cx="86" cy="32" r="5" fill={accent} stroke="none" />
        </G>
      );
    case "search":
      return (
        <G
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Circle cx="62" cy="48" r="18" />
          <Line x1="76" y1="62" x2="92" y2="78" />
          <Line x1="54" y1="48" x2="70" y2="48" stroke={accent} strokeWidth={2} />
        </G>
      );
    case "jobs":
      return (
        <G
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Rect x="36" y="38" width="68" height="42" rx="4" />
          <Path d="M58 38 v-6 q0 -4 4 -4 h16 q4 0 4 4 v6" />
          <Line x1="36" y1="56" x2="104" y2="56" />
          <Circle cx="70" cy="56" r="3" fill={accent} stroke="none" />
        </G>
      );
    case "onboarding":
      return (
        <G
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Circle cx="70" cy="44" r="11" />
          <Path d="M52 80 q0 -16 18 -16 q18 0 18 16" />
          <Path d="M88 30 l8 4 l-8 4" stroke={accent} strokeWidth={2} />
        </G>
      );
    case "settings":
      return (
        <G
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M70 26 l22 8 v18 q0 16 -22 26 q-22 -10 -22 -26 v-18 z" />
          <Path d="M60 52 l8 8 l16 -16" stroke={accent} strokeWidth={2} />
        </G>
      );
    case "saved":
      return (
        <G {...common}>
          <Circle cx="50" cy="40" r="18" />
          <Path d="M32 56 q12 -16 24 0 t24 0" stroke={accent} strokeWidth={2} fill="none" />
          <Line x1="38" y1="64" x2="62" y2="64" />
          <Line x1="50" y1="52" x2="50" y2="76" />
        </G>
      );
    default:
      return null;
  }
}

function BlockSet({ motif }: { motif: IllustrationMotif }): JSX.Element | null {
  const tint1 = c.brand100;
  const tint2 = c.brand200;
  const ink = c.brand700;
  const accent = c.accent600;
  switch (motif) {
    case "feed":
      return (
        <G>
          <Rect x="28" y="22" width="84" height="24" rx="4" fill={tint1} />
          <Rect x="28" y="50" width="62" height="24" rx="4" fill={tint2} />
          <Rect x="34" y="30" width="40" height="3" rx="1.5" fill={ink} />
          <Rect x="34" y="38" width="22" height="3" rx="1.5" fill={accent} />
          <Rect x="34" y="58" width="34" height="3" rx="1.5" fill={ink} />
          <Rect x="34" y="66" width="14" height="3" rx="1.5" fill={ink} opacity={0.5} />
        </G>
      );
    case "network":
      return (
        <G>
          <Circle cx="46" cy="50" r="16" fill={tint2} />
          <Circle cx="94" cy="50" r="16" fill={tint1} />
          <Rect x="60" y="46" width="20" height="8" rx="3" fill={accent} />
        </G>
      );
    case "messages":
      return (
        <G>
          <Rect x="26" y="30" width="60" height="28" rx="14" fill={tint2} />
          <Rect x="58" y="56" width="56" height="24" rx="12" fill={tint1} />
          <Circle cx="42" cy="44" r="2.5" fill={ink} />
          <Circle cx="54" cy="44" r="2.5" fill={ink} />
          <Circle cx="66" cy="44" r="2.5" fill={accent} />
        </G>
      );
    case "notifications":
      return (
        <G>
          <Rect x="50" y="28" width="40" height="44" rx="20" fill={tint1} />
          <Rect x="58" y="48" width="24" height="3" rx="1.5" fill={ink} />
          <Rect x="58" y="56" width="14" height="3" rx="1.5" fill={ink} opacity={0.55} />
          <Circle cx="88" cy="32" r="6" fill={accent} />
        </G>
      );
    case "search":
      return (
        <G>
          <Rect x="34" y="36" width="56" height="32" rx="16" fill={tint1} />
          <Rect x="42" y="48" width="34" height="3" rx="1.5" fill={ink} />
          <Rect x="42" y="56" width="20" height="3" rx="1.5" fill={ink} opacity={0.5} />
          <Rect
            x="86"
            y="62"
            width="16"
            height="6"
            rx="3"
            fill={accent}
            transform="rotate(38 94 65)"
          />
        </G>
      );
    case "jobs":
      return (
        <G>
          <Rect x="32" y="38" width="72" height="42" rx="4" fill={tint2} />
          <Rect x="58" y="30" width="20" height="10" rx="2" fill={tint1} />
          <Rect x="32" y="54" width="72" height="2" fill={ink} opacity={0.4} />
          <Rect x="64" y="50" width="8" height="8" rx="2" fill={accent} />
        </G>
      );
    case "onboarding":
      return (
        <G>
          <Circle cx="70" cy="42" r="14" fill={tint1} />
          <Rect x="48" y="60" width="44" height="22" rx="10" fill={tint2} />
          <Rect x="62" y="68" width="16" height="3" rx="1.5" fill={ink} />
          <Rect x="62" y="75" width="10" height="3" rx="1.5" fill={accent} />
        </G>
      );
    case "settings":
      return (
        <G>
          <Path d="M70 22 L98 36 V58 Q98 78 70 86 Q42 78 42 58 V36 Z" fill={tint1} />
          <Rect x="58" y="50" width="24" height="14" rx="3" fill={ink} />
          <Rect x="66" y="44" width="8" height="10" rx="2" fill={accent} />
        </G>
      );
    default:
      return null;
  }
}

function HarvestSet({ motif }: { motif: IllustrationMotif }): JSX.Element {
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
