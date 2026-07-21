import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";

export function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    content: {
      flex: 1,
      paddingHorizontal: nativeTokens.space[4],
      paddingTop: nativeTokens.space[3],
    },
    tabs: {
      marginBottom: nativeTokens.space[3],
    },
    listContent: {
      paddingBottom: nativeTokens.space[6],
    },
    separator: {
      height: nativeTokens.space[2],
    },
    skeletonStack: {
      gap: nativeTokens.space[2],
    },
    inlineError: {
      marginBottom: nativeTokens.space[3],
    },
    actions: {
      flexDirection: "row",
      gap: nativeTokens.space[2],
    },
  });
}

export type StylesSheet = ReturnType<typeof makeStyles>;

export function useStyles(): StylesSheet {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
