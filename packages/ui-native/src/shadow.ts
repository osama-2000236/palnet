import { tokens } from "@baydar/ui-tokens";
import { Platform, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export type ShadowKind = keyof typeof nativeTokens.shadow;

const WEB_SHADOW: Record<ShadowKind, ViewStyle> = {
  card: {
    boxShadow: tokens.shadow.card,
  } as ViewStyle,
  pop: {
    boxShadow: tokens.shadow.pop,
  } as ViewStyle,
  nav: {
    boxShadow: tokens.shadow.nav,
  } as ViewStyle,
  modal: {
    boxShadow: tokens.shadow.modal,
  } as ViewStyle,
};

export function shadowStyle(kind: ShadowKind): ViewStyle {
  if (Platform.OS === "web") return WEB_SHADOW[kind];
  return nativeTokens.shadow[kind];
}
