// Illustration — native twin of packages/ui-web/src/Illustration.tsx.
// 8 motifs × 3 directions, drawn via react-native-svg. Same viewBox + token kit as web.

import { View, type StyleProp, type ViewStyle } from "react-native";
import { Circle, G, Line, Path, Rect, Svg } from "react-native-svg";

import { HarvestSet } from "./IllustrationHarvest";
import { useThemeTokens } from "./ThemeProvider";
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

export function Illustration({
  motif,
  direction = "harvest",
  size = "md",
  tint = "sand",
  style,
}: IllustrationProps): JSX.Element {
  const px = nativeTokens.illustration.size[size];
  const h = Math.round((px * VB_H) / VB_W);
  const tk = useThemeTokens();
  const tintBg: Record<IllustrationTint, string> = {
    none: "transparent",
    sand: tk.color.surfaceSubtle,
    olive: tk.color.brand50,
    sunken: tk.color.surfaceSunken,
  };
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: px,
          height: h,
          backgroundColor: tintBg[tint],
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
  const c = useThemeTokens().color;
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
  const c = useThemeTokens().color;
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
