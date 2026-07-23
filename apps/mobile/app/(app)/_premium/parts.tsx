// Presentational parts + styles for the premium screen. Split out of
// me/premium/index.tsx to keep both files under the qa:design LOC ceiling.
// Underscore folder, so Expo Router does not treat it as a route.

import { Icon, nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

// Web twin: apps/web/src/app/[locale]/(app)/me/premium/page.tsx. Trust cues
// only — every line is something the product does. No invented member counts.
export const TRUST_KEYS = [
  { key: "cancel", icon: "clock" },
  { key: "rails", icon: "check" },
  { key: "karama", icon: "users" },
] as const;

export function FeatureList({ items }: { items: string[] }): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  return (
    <View style={styles.featureList}>
      {items.map((item) => (
        <View key={item} style={styles.featureRow}>
          <Icon name="check" size={16} color={c.brand600} />
          <Text style={styles.featureItem}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function TrustRow({
  icon,
  title,
  body,
}: {
  icon: "clock" | "check" | "users";
  title: string;
  body: string;
}): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  return (
    <View style={styles.featureRow}>
      <Icon name={icon} size={16} color={c.brand600} />
      <View style={styles.trustText}>
        <Text style={styles.trustTitle}>{title}</Text>
        <Text style={styles.trustBody}>{body}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    centerScreen: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: c.surfaceMuted,
      padding: nativeTokens.space[4],
    },
    scrollBody: {
      padding: nativeTokens.space[4],
      gap: nativeTokens.space[4],
    },
    kicker: {
      color: c.brand700,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "700",
    },
    title: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h1.size,
      lineHeight: nativeTokens.type.scale.h1.line,
      fontWeight: "700",
    },
    subtitle: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    planCard: {
      gap: nativeTokens.space[2],
    },
    premiumCard: {
      borderColor: c.brand600,
    },
    planHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: nativeTokens.space[2],
    },
    recommended: {
      color: c.brand700,
      backgroundColor: c.brand50,
      borderRadius: nativeTokens.radius.full,
      paddingHorizontal: nativeTokens.space[2],
      paddingVertical: nativeTokens.space[1],
      overflow: "hidden",
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      fontWeight: "700",
    },
    guarantee: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      textAlign: "center",
    },
    trustCard: {
      gap: nativeTokens.space[3],
    },
    trustText: {
      flexShrink: 1,
    },
    trustTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "700",
    },
    trustBody: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
    },
    planName: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    planTagline: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    planPrice: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h2.size,
      lineHeight: nativeTokens.type.scale.h2.line,
      fontWeight: "800",
    },
    planOriginal: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    featureList: {
      gap: nativeTokens.space[2],
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: nativeTokens.space[2],
    },
    featureItem: {
      flexShrink: 1,
      color: c.ink,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
  });
}

export function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
