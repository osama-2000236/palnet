// Illustration — native twin of packages/ui-web/src/Illustration.tsx.
// 10 motifs, drawn via react-native-svg. Same viewBox + token kit as web.
//
// Two directions here against web's three. DESIGN.md §7.5: `outline` is the
// admin/operator register, for `/moderation` and `/billing`. Mobile ships no
// admin surface, so the kit had no register on this platform and 100 lines of
// SVG that nothing could ever reach — "if a kit has no register, it gets
// deleted, not kept for later". `harvest` (member-facing) and `block`
// (failure) stay in lockstep with web.

import { View, type StyleProp, type ViewStyle } from "react-native";
import { Circle, G, Path, Rect, Svg } from "react-native-svg";

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
  "error",
  "saved",
] as const;
export type IllustrationMotif = (typeof ILLUSTRATION_MOTIFS)[number];

export const ILLUSTRATION_DIRECTIONS = ["block", "harvest"] as const;
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
        {direction === "block" ? <BlockSet motif={motif} /> : null}
        {direction === "harvest" ? <HarvestSet motif={motif} /> : null}
      </Svg>
    </View>
  );
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
    case "saved":
      return (
        <G>
          <Path d="M48 34 q0 -4 4 -4 h36 q4 0 4 4 v50 l-22 -14 l-22 14 z" fill={tint1} />
          <Rect x="58" y="44" width="24" height="4" rx="2" fill={ink} />
          <Rect x="58" y="54" width="14" height="4" rx="2" fill={accent} />
        </G>
      );
    case "error":
      return (
        <G>
          <Circle cx="70" cy="50" r="26" fill={tint1} />
          <Rect x="66" y="34" width="8" height="22" rx="4" fill={ink} />
          <Circle cx="70" cy="66" r="5" fill={accent} />
        </G>
      );
    default:
      return null;
  }
}
