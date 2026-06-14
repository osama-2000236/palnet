import { nativeTokens } from "@baydar/ui-native";
import { StyleSheet } from "react-native";

export const karamaStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: nativeTokens.color.surfaceMuted,
    padding: nativeTokens.space[4],
  },
  scrollBody: {
    padding: nativeTokens.space[4],
    gap: nativeTokens.space[4],
  },
  kicker: {
    color: nativeTokens.color.brand700,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
  },
  title: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    lineHeight: nativeTokens.type.scale.h1.line,
    fontWeight: "700",
  },
  subtitle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  balanceCard: {
    gap: nativeTokens.space[1],
  },
  balanceLabel: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  balanceValue: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    lineHeight: nativeTokens.type.scale.h1.line,
    fontWeight: "800",
    writingDirection: "ltr",
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
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
  },
  rewardBody: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  rewardCost: {
    color: nativeTokens.color.brand700,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: nativeTokens.color.accent600,
    borderRadius: nativeTokens.radius.full,
    paddingHorizontal: nativeTokens.space[2],
    paddingVertical: nativeTokens.space[1],
  },
  badgeText: {
    color: nativeTokens.color.accent700,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    fontWeight: "700",
  },
  ledger: {
    gap: nativeTokens.space[2],
  },
  sectionTitle: {
    color: nativeTokens.color.ink,
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
    borderTopColor: nativeTokens.color.lineSoft,
  },
  ledgerReason: {
    flex: 1,
    color: nativeTokens.color.ink,
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
    color: nativeTokens.color.brand700,
  },
  negative: {
    color: nativeTokens.color.danger,
  },
  ltr: {
    writingDirection: "ltr",
  },
});
