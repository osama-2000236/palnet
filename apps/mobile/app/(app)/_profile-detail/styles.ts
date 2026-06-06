import { StyleSheet } from "react-native";

import { nativeTokens } from "@baydar/ui-native";

export const profileStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: nativeTokens.color.surfaceMuted },
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
  },
  headline: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    marginTop: nativeTokens.space[1],
  },
  location: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    marginTop: nativeTokens.space[1],
  },
  handle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    marginTop: nativeTokens.space[1],
  },
  editWrap: {
    paddingHorizontal: nativeTokens.space[4],
    paddingBottom: nativeTokens.space[3],
    alignSelf: "flex-start",
  },
  actionsRow: {
    paddingHorizontal: nativeTokens.space[4],
    paddingBottom: nativeTokens.space[3],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
  },
  bodyText: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  experienceItemSpacing: { marginTop: nativeTokens.space[3] },
  itemTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600",
  },
  itemSubtitle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  itemDescription: {
    marginTop: nativeTokens.space[1],
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
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
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[1],
  },
  skillLabel: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  sectionTitle: {
    marginBottom: nativeTokens.space[2],
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h2.size,
    lineHeight: nativeTokens.type.scale.h2.line,
    fontWeight: "600",
  },
  footer: { paddingVertical: nativeTokens.space[3] },
});
