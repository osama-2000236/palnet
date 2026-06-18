// Surface — native twin of packages/ui-web/src/Surface.tsx.
// Same prop vocabulary: variant + padding + as is N/A on native (no HTML tags),
// and children render inside a plain <View>.
//
// Rule (mirrors web): don't nest `card` inside `card`. Use `flat` or `row`.

import type { ReactNode } from "react";
import { useMemo } from "react";
import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

import { shadowStyle } from "./shadow";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type SurfaceVariant = "flat" | "card" | "hero" | "tinted" | "row";

export type SurfacePadding = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "8" | "10" | "12";

export interface SurfaceProps extends Omit<ViewProps, "style"> {
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

// Padding maps to the spacing scale, which is theme-independent, so it stays
// module-scope. The colour-bearing variant styles come from the active theme
// (see useThemeTokens) — this is the reference pattern for making the rest of
// the native atoms theme-aware.
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
  const t = useThemeTokens();
  const variantStyle = useMemo<Record<SurfaceVariant, ViewStyle>>(() => {
    const c = t.color;
    return {
      flat: {
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: c.lineSoft,
        backgroundColor: c.surface,
      },
      card: {
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: c.lineSoft,
        backgroundColor: c.surface,
        ...shadowStyle("card"),
      },
      hero: {
        borderRadius: t.radius.xl,
        borderWidth: 1,
        borderColor: c.lineSoft,
        backgroundColor: c.surface,
        overflow: "hidden",
        ...shadowStyle("card"),
      },
      tinted: {
        borderRadius: t.radius.md,
        backgroundColor: c.surfaceSubtle,
      },
      row: {
        borderBottomWidth: 1,
        borderBottomColor: c.lineSoft,
        backgroundColor: "transparent",
      },
    };
  }, [t]);

  return (
    <View style={[variantStyle[variant], { padding: PAD_TO_SPACE[padding] }, style]} {...rest}>
      {children}
    </View>
  );
}
