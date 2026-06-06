import { StyleSheet } from "react-native";

import { nativeTokens } from "@baydar/ui-native";

export const styles = StyleSheet.create({
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
  errorScreen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
    padding: nativeTokens.space[4],
  },
  scrollBody: {
    padding: nativeTokens.space[4],
    gap: nativeTokens.space[4],
  },
  hero: {
    overflow: "hidden",
  },
  identityBlock: {
    marginTop: -nativeTokens.space[10],
    paddingHorizontal: nativeTokens.space[4],
    paddingBottom: nativeTokens.space[3],
    alignItems: "flex-start",
  },
  name: {
    marginTop: nativeTokens.space[3],
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.display.size,
    lineHeight: nativeTokens.type.scale.display.line,
    fontWeight: "700",
    textAlign: "right",
  },
  headline: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "right",
  },
  location: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  handle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.mono,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    marginTop: nativeTokens.space[1],
    writingDirection: "ltr",
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
    paddingHorizontal: nativeTokens.space[4],
    paddingBottom: nativeTokens.space[4],
  },
  progressRail: {
    gap: nativeTokens.space[2],
  },
  progressTitle: {
    color: nativeTokens.color.brand700,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
    textAlign: "right",
  },
  progressTrack: {
    height: nativeTokens.space[2],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.surfaceSunken,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.brand600,
  },
  section: {
    gap: nativeTokens.space[2],
  },
  sectionTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h2.size,
    lineHeight: nativeTokens.type.scale.h2.line,
    fontWeight: "700",
    textAlign: "right",
  },
  bodyText: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "right",
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  item: {
    gap: nativeTokens.space[1],
    paddingVertical: nativeTokens.space[2],
  },
  itemTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
    textAlign: "right",
  },
  itemMeta: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  itemBody: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
  },
  skillChip: {
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.surfaceSubtle,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[1],
  },
  skillLabel: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
});
