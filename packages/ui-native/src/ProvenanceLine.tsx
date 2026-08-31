// One clause saying why this list is in this order. Required on every ranked
// surface — feed, search, applicants, suggestions, composer reach, job reach.
//
// The visible half of the `settings.explainRanking` switch. It states the
// MECHANISM ("proximity first, then relevance"), never the benefit. See
// handoff/components/ProvenanceLine.md.

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface ProvenanceLineProps {
  /** One clause, no period. From i18n — never composed in the component. */
  text: string;
  /** Count or scope, rendered mono. */
  trailing?: string;
  tone?: "neutral" | "accent";
  /** Opens the ranking explanation. The whole row becomes the target. */
  onPress?: () => void;
  /** `band` = full-bleed tinted strip. `inline` = bare, for use inside a card. */
  variant?: "band" | "inline";
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProvenanceLine({
  text,
  trailing,
  tone = "neutral",
  onPress,
  variant = "band",
  testID,
  style,
}: ProvenanceLineProps): JSX.Element {
  const c = useThemeTokens().color;

  const body = (
    <View
      testID={testID ? `${testID}-row` : undefined}
      style={[
        styles.row,
        variant === "band"
          ? { backgroundColor: c.surfaceBand, borderBottomColor: c.ruleHairline }
          : styles.inline,
        onPress ? styles.pressable : null,
        style,
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID={testID ? `${testID}-dot` : undefined}
        style={[styles.dot, { backgroundColor: tone === "accent" ? c.accent500 : c.brand600 }]}
      />
      <Text style={[styles.text, { color: c.inkMuted }]}>{text}</Text>
      {trailing ? <Text style={[styles.trailing, { color: c.inkSubtle }]}>{trailing}</Text> : null}
    </View>
  );

  // Text and trailing read as one label so the screen reader does not split the
  // count from the clause.
  const label = trailing ? `${text} — ${trailing}` : text;

  if (!onPress) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={label} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
    paddingVertical: nativeTokens.space[3],
    paddingHorizontal: nativeTokens.space[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inline: {
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: nativeTokens.space[1],
  },
  pressable: {
    minHeight: nativeTokens.chrome.minHit,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: nativeTokens.radius.full,
  },
  text: {
    flex: 1,
    minWidth: 0,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.micro.size,
    lineHeight: nativeTokens.type.scale.micro.line,
    textAlign: "auto",
  },
  trailing: {
    fontFamily: nativeTokens.type.family.mono,
    fontSize: nativeTokens.type.scale.micro.size,
    lineHeight: nativeTokens.type.scale.micro.line,
    textAlign: "auto",
  },
});
