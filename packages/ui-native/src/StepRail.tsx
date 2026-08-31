// The application lifecycle as one horizontal device: sent → seen → interview
// → decision. Used by the worker's applications list AND the employer's
// post-a-job wizard — one vocabulary, not two progress widgets.
//
// Replaces the status BADGE as the primary signal. The badge stays, but it is a
// label; the rail is the position. See handoff/components/StepRail.md.

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface StepRailStep {
  key: string;
  label: string;
}

export interface StepRailProps {
  /** 3–5 steps. Four is the designed case. */
  steps: StepRailStep[];
  /** Index of the current step. `-1` = nothing reached yet. */
  current: number;
  terminal?: "none" | "success" | "closed";
  /** Colour of the CURRENT node only. Completed nodes are always brand600. */
  tone?: "brand" | "accent";
  /** Hides labels; rail only. For dense list rows. */
  compact?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function StepRail({
  steps,
  current,
  terminal = "none",
  tone = "accent",
  compact = false,
  accessibilityLabel,
  testID,
  style,
}: StepRailProps): JSX.Element {
  const c = useThemeTokens().color;

  // ponytail: unconditional — see the note in ScoreBar.
  if (steps.length < 3 || steps.length > 5) {
    throw new Error(`StepRail: expected 3–5 steps, received ${steps.length}.`);
  }

  const closed = terminal === "closed";
  const currentColor = closed ? c.barTrack : tone === "brand" ? c.brand600 : c.accent500;

  const nodeColor = (i: number): string => {
    if (closed) return c.barTrack;
    if (i < current) return c.brand600;
    if (i === current) return currentColor;
    return c.barTrack;
  };

  const currentStep = current >= 0 ? steps[current] : undefined;
  const label =
    accessibilityLabel ??
    (currentStep
      ? `${currentStep.label} — ${current + 1} / ${steps.length}`
      : `0 / ${steps.length}`);

  return (
    <View style={[styles.wrap, style]} testID={testID}>
      {/* RTL is the default, not a mirror: a plain `row` under an RTL writing
          direction is reversed by Yoga. Never hand-flip with row-reverse. */}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: steps.length, now: current + 1 }}
        style={styles.rail}
      >
        {steps.map((step, i) => (
          <View key={step.key} style={styles.railCell}>
            <View
              testID={testID ? `${testID}-segment-${i}` : undefined}
              style={[
                styles.segment,
                { backgroundColor: !closed && i <= current ? c.barFill : c.barTrack },
              ]}
            />
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID={testID ? `${testID}-node-${i}` : undefined}
              style={[
                styles.node,
                i === current ? styles.nodeCurrent : null,
                i === current ? { borderColor: c.surface } : null,
                { backgroundColor: nodeColor(i) },
              ]}
            />
          </View>
        ))}
        {/* One more segment than nodes: the tail past the last node. */}
        <View
          testID={testID ? `${testID}-segment-${steps.length}` : undefined}
          style={[
            styles.segment,
            {
              backgroundColor:
                !closed && current >= steps.length - 1 && terminal === "success"
                  ? c.barFill
                  : c.barTrack,
            },
          ]}
        />
      </View>
      {compact ? null : (
        <View style={styles.labels}>
          {steps.map((step, i) => (
            <View
              key={step.key}
              style={[
                styles.labelCell,
                i === 0
                  ? styles.labelStart
                  : i === steps.length - 1
                    ? styles.labelEnd
                    : styles.labelMiddle,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: i === current && !closed ? currentColor : c.inkSubtle },
                  i === current ? styles.labelCurrent : null,
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: nativeTokens.space[2],
  },
  rail: {
    flexDirection: "row",
    alignItems: "center",
  },
  railCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  segment: {
    flex: 1,
    height: nativeTokens.control.barHeight - 1,
    borderRadius: nativeTokens.radius.full,
  },
  node: {
    width: nativeTokens.control.railNode,
    height: nativeTokens.control.railNode,
    borderRadius: nativeTokens.radius.full,
    // Sits ON the rail rather than between segments.
    marginHorizontal: -1,
  },
  nodeCurrent: {
    width: nativeTokens.control.railNodeCurrent,
    height: nativeTokens.control.railNodeCurrent,
    borderWidth: 2,
  },
  labels: {
    flexDirection: "row",
  },
  // Alignment via flexbox, not textAlign — Yoga mirrors flex-start / flex-end
  // under RTL, RN's textAlign "right" is physical and lands on the wrong side.
  labelCell: {
    flex: 1,
    minWidth: 0,
  },
  labelStart: {
    alignItems: "flex-start",
  },
  labelMiddle: {
    alignItems: "center",
  },
  labelEnd: {
    alignItems: "flex-end",
  },
  label: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.micro.size,
    lineHeight: nativeTokens.type.scale.micro.line,
    textAlign: "auto",
  },
  labelCurrent: {
    fontWeight: "700",
  },
});
