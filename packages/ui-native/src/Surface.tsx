// Surface — native twin of packages/ui-web/src/Surface.tsx.
// Same prop vocabulary: variant + padding + as is N/A on native (no HTML tags),
// and children render inside a plain <View>.
//
// Rule (mirrors web): don't nest `card` inside `card`. Use `flat` or `row`.

import type { ReactNode } from "react";
import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export type SurfaceVariant = "flat" | "card" | "hero" | "tinted" | "row";

export type SurfacePadding =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "8"
  | "10"
  | "12";

export interface SurfaceProps extends Omit<ViewProps, "style"> {
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const c = nativeTokens.color;

const VARIANT_STYLE: Record<SurfaceVariant, ViewStyle> = {
  flat: {
    borderRadius: nativeTokens.radius.md,
    borderWidth: 1,
    borderColor: c.lineSoft,
    backgroundColor: c.surface,
  },
  card: {
    borderRadius: nativeTokens.radius.lg,
    borderWidth: 1,
    borderColor: c.lineSoft,
    backgroundColor: c.surface,
    ...nativeTokens.shadow.card,
  },
  hero: {
    borderRadius: nativeTokens.radius.xl,
    borderWidth: 1,
    borderColor: c.lineSoft,
    backgroundColor: c.surface,
    overflow: "hidden",
    ...nativeTokens.shadow.card,
  },
  tinted: {
    borderRadius: nativeTokens.radius.md,
    backgroundColor: c.surfaceSubtle,
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: c.lineSoft,
    backgroundColor: "transparent",
  },
};

const PAD_TO_SPACE = {
  "0": 0,
  "1": nativeTokens.space[1],
  "2": nativeTokens.space[2],
  "3": nativeTokens.space[3],
  "4": nativeTokens.space[4],
  "5": nativeTokens.space[5],
  "6": nativeTokens.space[6],
  "8": nativeTokens.space[8],
  "10": nativeTokens.space[10],
  "12": nativeTokens.space[12],
} as const;

export function Surface({
  variant = "card",
  padding = "4",
  style,
  children,
  ...rest
}: SurfaceProps): JSX.Element {
  return (
    <View
      style={[VARIANT_STYLE[variant], { padding: PAD_TO_SPACE[padding] }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
