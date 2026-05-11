// OnboardingProgress — native twin of packages/ui-web/src/OnboardingProgress.tsx.

import type { JSX } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { nativeTokens } from "./tokens";

export interface OnboardingProgressProps {
  step: number;
  totalSteps: number;
  accessibilityLabel?: string;
  stepLabels?: readonly string[];
  style?: StyleProp<ViewStyle>;
}

export function OnboardingProgress({
  step,
  totalSteps,
  accessibilityLabel,
  stepLabels,
  style,
}: OnboardingProgressProps): JSX.Element {
  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 1, max: totalSteps, now: step }}
      style={[styles.row, style]}
    >
      {dots.map((n, i) => {
        const isCurrent = n === step;
        const isDone = n < step;
        const dotStyle = [
          styles.dot,
          isDone || isCurrent ? styles.dotActive : styles.dotPending,
          isCurrent ? styles.dotCurrent : null,
        ];
        return (
          <View key={n} style={styles.cell}>
            <View accessibilityLabel={stepLabels?.[i]} style={dotStyle}>
              {isDone ? (
                <Svg width={12} height={12} viewBox="0 0 24 24">
                  <Path
                    d="M5 13l4 4 10-12"
                    stroke={nativeTokens.color.inkInverse}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              ) : (
                <Text style={isCurrent ? styles.numActive : styles.numPending}>{n}</Text>
              )}
            </View>
            {n < totalSteps ? (
              <View
                style={[
                  styles.connector,
                  isDone ? styles.connectorDone : styles.connectorPending,
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
  },
  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: nativeTokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { backgroundColor: nativeTokens.color.brand600 },
  dotPending: { backgroundColor: nativeTokens.color.surfaceSunken },
  dotCurrent: {
    borderWidth: 4,
    borderColor: nativeTokens.color.brand100,
  },
  connector: {
    width: 32,
    height: 1,
    borderRadius: nativeTokens.radius.full,
  },
  connectorDone: { backgroundColor: nativeTokens.color.brand600 },
  connectorPending: { backgroundColor: nativeTokens.color.surfaceSunken },
  numActive: {
    color: nativeTokens.color.inkInverse,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: 11,
    fontWeight: "700",
  },
  numPending: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: 11,
    fontWeight: "700",
  },
});
