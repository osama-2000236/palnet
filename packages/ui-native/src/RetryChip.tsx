// RetryChip — native twin of packages/ui-web/src/RetryChip.tsx.
//
// MVP API; design final spec owed (HANDOFF-TO-DESIGN-2026-05-16 §C.24).

import type { ReactElement } from "react";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export interface RetryChipProps {
  onRetry(): void;
  label: string;
  loading?: boolean;
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RetryChip({
  onRetry,
  label,
  loading,
  inline,
  style,
}: RetryChipProps): ReactElement {
  const c = nativeTokens.color;
  return (
    <Pressable
      onPress={onRetry}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading }}
      hitSlop={8}
      style={[
        {
          paddingHorizontal: inline ? nativeTokens.space[1] : nativeTokens.space[2],
          paddingVertical: nativeTokens.space[1],
          borderRadius: nativeTokens.radius.md,
          opacity: loading ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: c.brand700,
          fontSize: 12,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
