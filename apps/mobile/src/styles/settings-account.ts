import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";

export function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    body: {
      padding: nativeTokens.space[4],
      gap: nativeTokens.space[4],
    },
    title: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h1.size,
      lineHeight: nativeTokens.type.scale.h1.line,
      fontWeight: "700",
    },
    section: {
      gap: nativeTokens.space[3],
    },
    sectionTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    dangerTitle: {
      color: c.danger,
    },
    copy: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    emailRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: nativeTokens.space[2],
    },
    emailText: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      writingDirection: "ltr",
    },
    badge: {
      borderRadius: nativeTokens.radius.full,
      paddingHorizontal: nativeTokens.space[2],
      paddingVertical: 2,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      fontWeight: "600",
    },
    verifiedBadge: {
      color: c.brand700,
      backgroundColor: c.brand50,
    },
    unverifiedBadge: {
      color: c.inkMuted,
      backgroundColor: c.surfaceSubtle,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: c.scrim,
      padding: nativeTokens.space[4],
    },
    modal: {
      gap: nativeTokens.space[3],
      borderRadius: nativeTokens.radius.lg,
      backgroundColor: c.surface,
      padding: nativeTokens.space[4],
    },
    input: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.mono,
      writingDirection: "ltr",
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: nativeTokens.space[2],
    },
  });
}

export function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
