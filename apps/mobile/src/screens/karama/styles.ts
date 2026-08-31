import { useMemo } from "react";
import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";
import { StyleSheet } from "react-native";

function makeKaramaStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    scrollBody: {
      padding: nativeTokens.space[4],
      gap: nativeTokens.space[4],
    },
    rewardCard: {
      gap: nativeTokens.space[2],
    },
    rewardHeader: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: nativeTokens.space[2],
    },
    rewardTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    rewardBody: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    rewardCost: {
      color: c.brand700,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "700",
    },
    badge: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: c.accent600,
      borderRadius: nativeTokens.radius.full,
      paddingHorizontal: nativeTokens.space[2],
      paddingVertical: nativeTokens.space[1],
    },
    badgeText: {
      color: c.accent700,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      fontWeight: "700",
    },
    ledger: {
      gap: nativeTokens.space[2],
    },
    sectionTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    ledgerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[2],
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
    },
    ledgerReason: {
      flex: 1,
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    ledgerDelta: {
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "700",
      writingDirection: "ltr",
    },
    positive: {
      color: c.brand700,
    },
    negative: {
      color: c.danger,
    },
    ltr: {
      writingDirection: "ltr",
    },
  });
}

export type KaramaStylesSheet = ReturnType<typeof makeKaramaStyles>;

export function useKaramaStyles(): KaramaStylesSheet {
  const c = useThemeTokens().color;
  return useMemo(() => makeKaramaStyles(c), [c]);
}
