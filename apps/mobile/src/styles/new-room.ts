import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";

export function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    wrap: {
      flex: 1,
      gap: nativeTokens.space[3],
      paddingHorizontal: nativeTokens.space[4],
      paddingTop: nativeTokens.space[6],
      paddingBottom: nativeTokens.space[4],
    },
    label: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      fontWeight: "700",
    },
    spaced: {
      marginTop: nativeTokens.space[3],
    },
    inputSpacing: {
      marginTop: nativeTokens.space[1],
    },
    error: {
      color: c.danger,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
    },
    list: {
      paddingBottom: nativeTokens.space[3],
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[3],
    },
    personText: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      fontWeight: "700",
    },
    headline: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
    },
  });
}

export function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
