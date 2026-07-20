import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";

export function makeProfileStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.surfaceMuted },
    errorScreen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
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
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.display.size,
      lineHeight: nativeTokens.type.scale.display.line,
      fontWeight: "700",
    },
    headline: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      marginTop: nativeTokens.space[1],
    },
    location: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      marginTop: nativeTokens.space[1],
    },
    handle: {
      color: c.inkMuted,
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
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
    },
    emptyText: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
    },
    experienceItemSpacing: { marginTop: nativeTokens.space[3] },
    itemTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "600",
    },
    itemSubtitle: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
    },
    itemDescription: {
      marginTop: nativeTokens.space[1],
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
    },
    skillsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: nativeTokens.space[2],
    },
    skillsList: {
      gap: nativeTokens.space[2],
    },
    skillItem: {
      borderWidth: 1,
      borderColor: c.lineSoft,
      borderRadius: nativeTokens.radius.md,
      padding: nativeTokens.space[3],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: nativeTokens.space[3],
    },
    skillCopy: {
      flex: 1,
      minWidth: 0,
    },
    skillChip: {
      borderWidth: 1,
      borderColor: c.lineHard,
      borderRadius: nativeTokens.radius.full,
      paddingHorizontal: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[1],
    },
    skillLabel: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
    },
    skillMeta: {
      marginTop: nativeTokens.space[1],
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
    },
    skillCount: {
      writingDirection: "ltr",
    },
    skillNotice: {
      marginTop: nativeTokens.space[2],
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    sectionTitle: {
      marginBottom: nativeTokens.space[2],
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h2.size,
      lineHeight: nativeTokens.type.scale.h2.line,
      fontWeight: "600",
    },
    footer: { paddingVertical: nativeTokens.space[3] },
  });
}

export type ProfileStylesSheet = ReturnType<typeof makeProfileStyles>;

export function useProfileStyles(): ProfileStylesSheet {
  const c = useThemeTokens().color;
  return useMemo(() => makeProfileStyles(c), [c]);
}
