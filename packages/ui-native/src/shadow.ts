import { Platform, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export type ShadowKind = keyof typeof nativeTokens.shadow;

const WEB_SHADOW: Record<ShadowKind, ViewStyle> = {
  card: {
    boxShadow: "0px 1px 2px rgba(26, 26, 23, 0.04), 0px 1px 3px rgba(26, 26, 23, 0.05)",
  } as ViewStyle,
  pop: {
    boxShadow: "0px 10px 28px rgba(26, 26, 23, 0.12)",
  } as ViewStyle,
  nav: {
    boxShadow: "0px 1px 0px rgba(26, 26, 23, 0.06)",
  } as ViewStyle,
  modal: {
    boxShadow: "0px 24px 60px rgba(26, 26, 23, 0.20), 0px 4px 12px rgba(26, 26, 23, 0.08)",
  } as ViewStyle,
};

export function shadowStyle(kind: ShadowKind): ViewStyle {
  if (Platform.OS === "web") return WEB_SHADOW[kind];
  return nativeTokens.shadow[kind];
}
