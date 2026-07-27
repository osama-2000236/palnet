// Badge — native twin of packages/ui-web/src/Badge.tsx. Same tone / size / dot
// vocabulary; `srLabel` maps to `accessibilityLabel` on the wrapper.
//
// Colours resolve at render from useThemeTokens(), never at module scope — a
// StyleSheet.create colour is frozen to the light palette (lint:tokens rule 4).

import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type BadgeTone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  dot?: boolean;
  /** Spoken name. Omit and the badge is hidden from the accessibility tree. */
  srLabel?: string;
}

const SIZE: Record<BadgeSize, { height: number; paddingInline: number; fontSize: number }> = {
  sm: {
    height: nativeTokens.space[4],
    paddingInline: nativeTokens.space[1],
    fontSize: nativeTokens.type.scale.micro.size,
  },
  md: {
    height: nativeTokens.space[5],
    paddingInline: nativeTokens.space[2],
    fontSize: nativeTokens.type.scale.micro.size,
  },
};

export function Badge({
  children,
  tone = "neutral",
  size = "md",
  dot = false,
  srLabel,
}: BadgeProps): JSX.Element {
  const c = useThemeTokens().color;
  const TONE: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
    neutral: { bg: c.surfaceSubtle, fg: c.inkMuted, dot: c.inkSubtle },
    brand: { bg: c.brand50, fg: c.brand700, dot: c.brand600 },
    accent: { bg: c.accent600, fg: c.inkInverse, dot: c.inkInverse },
    success: { bg: c.successSoft, fg: c.success, dot: c.success },
    warning: { bg: c.warningSoft, fg: c.warning, dot: c.warning },
    danger: { bg: c.dangerSoft, fg: c.danger, dot: c.danger },
  };
  const palette = TONE[tone];
  const dims = SIZE[size];

  return (
    <View
      accessible={Boolean(srLabel)}
      accessibilityLabel={srLabel}
      importantForAccessibility={srLabel ? "yes" : "no-hide-descendants"}
      style={[
        styles.box,
        {
          minHeight: dims.height,
          minWidth: dims.height,
          paddingHorizontal: dims.paddingInline,
          backgroundColor: palette.bg,
        },
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: palette.dot }]} /> : null}
      <Text
        numberOfLines={1}
        style={[styles.label, { color: palette.fg, fontSize: dims.fontSize }]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeTokens.space[1],
    borderRadius: nativeTokens.radius.full,
  },
  dot: {
    width: nativeTokens.space[1] + 2,
    height: nativeTokens.space[1] + 2,
    borderRadius: nativeTokens.radius.full,
  },
  label: {
    fontFamily: nativeTokens.type.family.sans,
    fontWeight: "600",
  },
});
