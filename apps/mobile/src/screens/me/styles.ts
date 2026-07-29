import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";

export function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
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
      textAlign: "auto",
    },
    headline: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      textAlign: "auto",
    },
    location: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      textAlign: "auto",
    },
    handle: {
      color: c.inkMuted,
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
      color: c.brand700,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "700",
      textAlign: "auto",
    },
    progressTrack: {
      height: nativeTokens.space[2],
      borderRadius: nativeTokens.radius.full,
      backgroundColor: c.surfaceSunken,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: nativeTokens.radius.full,
      backgroundColor: c.brand600,
    },
    progressNext: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      textAlign: "auto",
    },
    pressed: { opacity: 0.88 },
    section: {
      gap: nativeTokens.space[2],
    },
    sectionTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h2.size,
      lineHeight: nativeTokens.type.scale.h2.line,
      fontWeight: "700",
      textAlign: "auto",
    },
    bodyText: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      textAlign: "auto",
    },
    emptyText: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      textAlign: "auto",
    },
    item: {
      gap: nativeTokens.space[1],
      paddingVertical: nativeTokens.space[2],
    },
    itemTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
      textAlign: "auto",
    },
    itemMeta: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      textAlign: "auto",
    },
    itemBody: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      textAlign: "auto",
    },
    skillsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: nativeTokens.space[2],
    },
    skillChip: {
      borderWidth: 1,
      borderColor: c.lineHard,
      borderRadius: nativeTokens.radius.full,
      backgroundColor: c.surfaceSubtle,
      paddingHorizontal: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[1],
    },
    skillLabel: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
  });
}

export type StylesSheet = ReturnType<typeof makeStyles>;

export function useStyles(): StylesSheet {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
