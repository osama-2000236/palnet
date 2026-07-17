// Illustration — native twin of packages/ui-web/src/Illustration.tsx.
// Drawn via react-native-svg. Same viewBox + token kit as web.
// ponytail: harvest kit only — outline/block kits were never rendered;
// recover from git history if a future design pass wants them.

import { View, type StyleProp, type ViewStyle } from "react-native";
import { Svg } from "react-native-svg";

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

export type IllustrationSize = "sm" | "md" | "lg";
export type IllustrationTint = "none" | "sand" | "olive" | "sunken";

export interface IllustrationProps {
  motif: IllustrationMotif;
  size?: IllustrationSize;
  tint?: IllustrationTint;
  style?: StyleProp<ViewStyle>;
}

const VB_W = 140;
const VB_H = 100;

export function Illustration({
  motif,
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
        <HarvestSet motif={motif} />
      </Svg>
    </View>
  );
}
