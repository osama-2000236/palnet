import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export interface OnboardingProgressStep {
  key: string;
  label: string;
}

export interface OnboardingProgressProps {
  steps: ReadonlyArray<OnboardingProgressStep>;
  active: number;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function OnboardingProgress({
  steps,
  active,
  accessibilityLabel,
  style,
}: OnboardingProgressProps): JSX.Element {
  const total = steps.length;
  const clamped = Math.max(0, Math.min(active, total - 1));
  const current = steps[clamped];

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 1, max: total, now: clamped + 1, text: current?.label }}
      style={[{ gap: nativeTokens.space[2] }, style]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", gap: nativeTokens.space[1] }}
      >
        {steps.map((step, index) => {
          const done = index <= clamped;
          return (
            <View
              key={step.key}
              style={{
                flex: 1,
                height: 6,
                borderRadius: nativeTokens.radius.full,
                backgroundColor: done
                  ? nativeTokens.color.brand600
                  : nativeTokens.color.surfaceSunken,
              }}
            />
          );
        })}
      </View>
      {current ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: nativeTokens.space[2],
          }}
        >
          <Text
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
              fontWeight: "700",
              lineHeight: nativeTokens.type.scale.small.line,
              textAlign: "right",
            }}
          >
            {current.label}
          </Text>
          <Text
            style={{
              color: nativeTokens.color.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.caption.size,
              fontWeight: "600",
              lineHeight: nativeTokens.type.scale.caption.line,
            }}
          >
            {clamped + 1} / {total}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
