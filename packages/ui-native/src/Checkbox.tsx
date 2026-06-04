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

import { nativeTokens } from "./tokens";

export interface CheckboxProps extends Omit<PressableProps, "children" | "style"> {
  checked: boolean;
  onChange(value: boolean): void;
  label?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  helper?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function Checkbox({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled = false,
  error = false,
  errorMessage,
  helper,
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityState,
  ...rest
}: CheckboxProps): JSX.Element {
  const c = nativeTokens.color;
  const message = errorMessage ?? helper;

  return (
    <View style={[{ gap: nativeTokens.space[1], alignSelf: "flex-start" }, style]}>
      <Pressable
        {...rest}
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel ?? ariaLabel}
        accessibilityState={{ checked, disabled, ...accessibilityState }}
        disabled={disabled}
        onPress={() => onChange(!checked)}
        hitSlop={10}
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: nativeTokens.space[2],
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <View
          style={{
            width: nativeTokens.space[4],
            height: nativeTokens.space[4],
            marginTop: 2,
            borderRadius: nativeTokens.radius.xs,
            borderWidth: 1,
            borderColor: error ? c.danger : checked ? c.brand600 : c.lineHard,
            backgroundColor: checked ? c.brand600 : c.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked ? (
            <Text
              style={{
                color: c.inkInverse,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: 12,
                lineHeight: 14,
                fontWeight: "700",
              }}
            >
              ✓
            </Text>
          ) : null}
        </View>
        {label ? (
          <Text
            style={[
              {
                color: c.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
                lineHeight: nativeTokens.type.scale.small.line,
              },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        ) : null}
      </Pressable>
      {message ? (
        <Text
          style={{
            color: errorMessage ? c.danger : c.inkMuted,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
            lineHeight: nativeTokens.type.scale.caption.line,
          }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
