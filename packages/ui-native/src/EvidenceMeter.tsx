// EvidenceMeter — native twin of packages/ui-web/src/EvidenceMeter.tsx.
//
// Same prop vocabulary: score / scoreValue / label / terms. Native has no
// `className`. Same rule on both platforms: the terms always render with the
// number, because a bare score is a judgement nobody can act on.
//
// Colours resolve at render from useThemeTokens(), never at module scope — a
// StyleSheet.create colour is frozen to the light palette (lint:tokens rule 4).

import { StyleSheet, Text, View } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface EvidenceTerm {
  key: string;
  label: string;
  value: string;
  /** 0..1. Drives the bar; the number beside it is what the reader trusts. */
  fill: number;
}

export interface EvidenceMeterProps {
  /** 0-100, already formatted in the reader's digits. */
  score: string;
  /** Raw 0-100, for the progress semantics screen readers get. */
  scoreValue: number;
  label: string;
  terms: EvidenceTerm[];
}

export function EvidenceMeter({
  score,
  scoreValue,
  label,
  terms,
}: EvidenceMeterProps): JSX.Element {
  const c = useThemeTokens().color;

  return (
    <View style={styles.root}>
      <View style={styles.headRow}>
        <Text style={[styles.label, { color: c.inkMuted }]}>{label}</Text>
        <Text
          accessibilityRole="progressbar"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: scoreValue }}
          style={[styles.score, { color: c.ink }]}
        >
          {score}
        </Text>
      </View>

      {terms.map((term) => (
        <View key={term.key} style={styles.term}>
          <View style={styles.headRow}>
            <Text style={[styles.termLabel, { color: c.ink }]}>{term.label}</Text>
            <Text style={[styles.termValue, { color: c.inkMuted }]}>{term.value}</Text>
          </View>
          {/* Hidden from the accessibility tree: the row above already carries
              the same fact as text, and a second announcement per term is noise. */}
          <View
            importantForAccessibility="no-hide-descendants"
            style={[styles.track, { backgroundColor: c.surfaceSubtle }]}
          >
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: c.brand600,
                  width: `${Math.round(Math.min(Math.max(term.fill, 0), 1) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: nativeTokens.space[3] },
  headRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: nativeTokens.space[2],
  },
  label: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  score: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    fontWeight: "600",
  },
  term: { gap: nativeTokens.space[1] },
  termLabel: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  termValue: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.micro.size,
  },
  track: {
    height: nativeTokens.space[1],
    borderRadius: nativeTokens.radius.full,
    overflow: "hidden",
  },
  fill: { height: nativeTokens.space[1], borderRadius: nativeTokens.radius.full },
});
