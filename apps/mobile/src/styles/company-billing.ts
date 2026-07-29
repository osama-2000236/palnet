import { useMemo } from "react";
import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";
import { StyleSheet } from "react-native";

export function makeCompanyBillingStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.surfaceMuted },
    scrollBody: { padding: nativeTokens.space[4], gap: nativeTokens.space[4] },
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
    summaryCard: { gap: nativeTokens.space[1] },
    summaryLabel: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    summarySpacer: { marginTop: nativeTokens.space[3] },
    summaryValue: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    sectionTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    bodyText: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    warnText: {
      color: c.warning,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    planCard: { gap: nativeTokens.space[2] },
    selectedPlanCard: { borderColor: c.brand600 },
    planName: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    planPrice: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h2.size,
      lineHeight: nativeTokens.type.scale.h2.line,
      fontWeight: "800",
    },
    featureList: { gap: nativeTokens.space[2] },
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

export type CompanyBillingStylesSheet = ReturnType<typeof makeCompanyBillingStyles>;

export function useCompanyBillingStyles(): CompanyBillingStylesSheet {
  const c = useThemeTokens().color;
  return useMemo(() => makeCompanyBillingStyles(c), [c]);
}
