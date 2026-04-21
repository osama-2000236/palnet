// Button — native twin of packages/ui-web/src/Button.tsx.
//
// Same prop vocabulary (variant / size / leading / trailing / loading /
// fullWidth / disabled). Uses Pressable for the active-press opacity per spec
// and hitSlop to guarantee a 44pt touch target even on `sm`.
//
// onPress replaces onClick on native per spec.

import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { nativeTokens } from "./tokens";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "accent"
  | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
}

const c = nativeTokens.color;

const VARIANT_BG: Record<ButtonVariant, string> = {
  primary: c.brand600,
  secondary: c.surface,
  ghost: "transparent",
  accent: c.accent600,
  "danger-ghost": "transparent",
};

const VARIANT_FG: Record<ButtonVariant, string> = {
  primary: c.inkInverse,
  secondary: c.ink,
  ghost: c.ink,
  accent: c.inkInverse,
  "danger-ghost": c.danger,
};

const VARIANT_BORDER: Record<ButtonVariant, string> = {
  primary: c.brand600,
  secondary: c.lineHard,
  ghost: "transparent",
  accent: c.accent600,
  "danger-ghost": "transparent",
};

// Spec heights: 28 / 36 / 44. Minimum touch target is 44pt on mobile
// (spec: mobile hit area = 44 for sm/md, 48 for lg).
const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 28, md: 36, lg: 44 };
const SIZE_PAD_X: Record<ButtonSize, number> = { sm: 10, md: 16, lg: 22 };
const SIZE_FONT: Record<ButtonSize, number> = { sm: 13, md: 14, lg: 15 };
const SIZE_GAP: Record<ButtonSize, number> = { sm: 6, md: 8, lg: 8 };
const SIZE_HIT_TARGET: Record<ButtonSize, number> = { sm: 44, md: 44, lg: 48 };

export function Button({
  variant = "primary",
  size = "md",
  leading,
  trailing,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  textStyle,
  children,
  accessibilityLabel,
  accessibilityState,
  hitSlop,
  ...rest
}: ButtonProps): JSX.Element {
  const isDisabled = !!disabled || loading;
  const hit = SIZE_HIT_TARGET[size];
  const extraHit = Math.max(0, (hit - SIZE_HEIGHT[size]) / 2);

  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: SIZE_HEIGHT[size],
    paddingHorizontal: SIZE_PAD_X[size],
    borderRadius: nativeTokens.radius.md,
    borderWidth: 1,
    borderColor: VARIANT_BORDER[variant],
    backgroundColor: VARIANT_BG[variant],
    gap: SIZE_GAP[size],
    opacity: isDisabled ? 0.55 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  };

  const label: TextStyle = {
    color: VARIANT_FG[variant],
    fontSize: SIZE_FONT[size],
    fontWeight: "600",
    fontFamily: nativeTokens.type.family.sans,
  };

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading, ...accessibilityState }}
      hitSlop={hitSlop ?? { top: extraHit, bottom: extraHit, left: extraHit, right: extraHit }}
      style={({ pressed }) => [
        base,
        // Spec: mobile active → opacity 0.85.
        pressed && !isDisabled ? { opacity: 0.85 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={VARIANT_FG[variant]} />
      ) : leading ? (
        <View>{leading}</View>
      ) : null}
      {children !== undefined && children !== null ? (
        typeof children === "string" ? (
          <Text style={[label, textStyle]}>{children}</Text>
        ) : (
          <View>{children}</View>
        )
      ) : null}
      {trailing && !loading ? <View>{trailing}</View> : null}
    </Pressable>
  );
}
