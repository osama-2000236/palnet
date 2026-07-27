// Chip - native twin of packages/ui-web/src/Chip.tsx.
//
// Shared prop vocabulary: selected / active, size, leading, disabled.
// Native uses onPress instead of web onClick.

import type { ReactNode } from "react";
import {
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { Icon } from "./Icon";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type ChipSize = "sm" | "md";

export interface ChipProps extends Omit<PressableProps, "children" | "style"> {
  children: ReactNode;
  size?: ChipSize;
  selected?: boolean;
  /** Back-compat alias for selected. Ignored when selected is provided. */
  active?: boolean;
  leading?: ReactNode;
  dotColor?: string;
  onRemove?: () => void;
  removeAccessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const SIZE: Record<
  ChipSize,
  { height: number; paddingInline: number; gap: number; fontSize: number; closeSize: number }
> = {
  sm: {
    height: nativeTokens.space[6],
    paddingInline: nativeTokens.space[2],
    gap: nativeTokens.space[1],
    fontSize: nativeTokens.type.scale.caption.size,
    closeSize: nativeTokens.space[4],
  },
  md: {
    height: nativeTokens.space[8],
    paddingInline: nativeTokens.space[3],
    gap: nativeTokens.space[2],
    fontSize: nativeTokens.type.scale.small.size,
    closeSize: nativeTokens.space[5],
  },
};

export function Chip({
  children,
  size = "md",
  selected,
  active = false,
  leading,
  dotColor,
  onPress,
  onRemove,
  removeAccessibilityLabel,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityState,
  hitSlop,
  ...rest
}: ChipProps): JSX.Element {
  const isSelected = selected ?? active;
  const interactive = Boolean(onPress) && !disabled;
  const s = SIZE[size];
  const c = useThemeTokens().color;
  const extraHit = Math.max(0, (nativeTokens.chrome.minHit - s.height) / 2);

  const container: ViewStyle = {
    minHeight: s.height,
    borderRadius: nativeTokens.radius.full,
    borderWidth: 1,
    borderColor: isSelected ? c.brand600 : c.lineHard,
    backgroundColor: isSelected ? c.brand50 : c.surface,
    paddingHorizontal: s.paddingInline,
    flexDirection: "row",
    alignItems: "center",
    gap: s.gap,
    opacity: disabled ? 0.55 : 1,
    alignSelf: "flex-start",
  };

  const label: TextStyle = {
    color: isSelected ? c.brand700 : c.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: s.fontSize,
    fontWeight: "500",
  };

  const content = (
    <>
      {dotColor ? (
        <View
          pointerEvents="none"
          style={{
            width: 6,
            height: 6,
            borderRadius: nativeTokens.radius.full,
            backgroundColor: dotColor,
          }}
        />
      ) : null}
      {/* Selected was colour-only on both platforms. See the web twin for why
          the check is the cue and why only a toggleable chip gets one. */}
      {interactive && isSelected ? (
        <Icon name="check" size={size === "sm" ? 12 : 14} color={c.brand700} strokeWidth={2.6} />
      ) : null}
      {leading ? <View pointerEvents="none">{leading}</View> : null}
      {typeof children === "string" ? (
        <Text numberOfLines={1} style={[label, textStyle]}>
          {children}
        </Text>
      ) : (
        <View>{children}</View>
      )}
      {onRemove && !disabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={removeAccessibilityLabel ?? "Remove"}
          onPress={(event) => {
            event?.stopPropagation?.();
            onRemove();
          }}
          hitSlop={8}
          style={{
            width: s.closeSize,
            height: s.closeSize,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: nativeTokens.radius.full,
          }}
        >
          <Text style={[label, { lineHeight: s.closeSize, color: c.inkMuted }]}>x</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <Pressable
        {...rest}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isSelected, disabled, ...accessibilityState }}
        onPress={onPress}
        hitSlop={hitSlop ?? { top: extraHit, bottom: extraHit, left: extraHit, right: extraHit }}
        style={({ pressed }) => [container, pressed ? { opacity: 0.85 } : null, style]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected, disabled, ...accessibilityState }}
      style={[container, style]}
    >
      {content}
    </View>
  );
}
