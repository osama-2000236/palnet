import type { ReactNode } from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface RadioGroupItem {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  /** Locale-independent handle for E2E — labels are translated, so a flow that
   *  changes the locale cannot find its own control by text. */
  testID?: string;
}

export interface RadioGroupProps {
  items: readonly RadioGroupItem[];
  value: string;
  onValueChange(value: string): void;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function RadioGroup({
  items,
  value,
  onValueChange,
  label,
  disabled = false,
  error = false,
  errorMessage,
  style,
  itemStyle,
  textStyle,
}: RadioGroupProps): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[{ gap: nativeTokens.space[2] }, style]}
    >
      {label ? (
        <Text
          style={{
            color: c.ink,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.small.size,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: nativeTokens.space[2] }}>
        {items.map((item) => {
          const checked = item.value === value;
          const isDisabled = disabled || item.disabled;
          return (
            <Pressable
              key={item.value}
              testID={item.testID}
              accessibilityRole="radio"
              accessibilityLabel={typeof item.label === "string" ? item.label : undefined}
              accessibilityState={{ checked, disabled: isDisabled }}
              disabled={isDisabled}
              onPress={() => onValueChange(item.value)}
              hitSlop={8}
              style={[
                {
                  minHeight: nativeTokens.space[8],
                  borderRadius: nativeTokens.radius.full,
                  borderWidth: 1,
                  borderColor: error ? c.danger : checked ? c.brand600 : c.lineHard,
                  backgroundColor: checked ? c.brand50 : c.surface,
                  paddingHorizontal: nativeTokens.space[3],
                  alignItems: "center",
                  flexDirection: "row",
                  gap: nativeTokens.space[2],
                  opacity: isDisabled ? 0.55 : 1,
                },
                itemStyle,
              ]}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: nativeTokens.radius.full,
                  backgroundColor: checked ? c.brand600 : c.lineHard,
                }}
              />
              <Text
                style={[
                  {
                    color: checked ? c.brand700 : c.inkMuted,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.caption.size,
                    fontWeight: "600",
                  },
                  textStyle,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errorMessage ? (
        <Text
          style={{
            color: c.danger,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
          }}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
