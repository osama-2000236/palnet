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
      gap: nativeTokens.space[3],
      paddingHorizontal: nativeTokens.space[4],
      paddingTop: nativeTokens.space[8],
    },
    authorChip: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[2],
    },
    authorText: {
      color: c.inkMuted,
      fontSize: nativeTokens.type.scale.small.size,
      fontFamily: nativeTokens.type.family.sans,
    },
    bodyInput: {
      minHeight: nativeTokens.space[20] * 2,
      color: c.ink,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      fontFamily: nativeTokens.type.family.body,
    },
    counter: {
      alignSelf: "flex-end",
      color: c.inkMuted,
      fontSize: nativeTokens.type.scale.caption.size,
      fontFamily: nativeTokens.type.family.mono,
    },
    mediaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: nativeTokens.space[2],
    },
    mediaThumbWrap: {
      width: nativeTokens.space[20],
      height: nativeTokens.space[20],
    },
    mediaThumb: {
      width: "100%",
      height: "100%",
      borderRadius: nativeTokens.radius.md,
    },
    removeBadge: {
      position: "absolute",
      top: nativeTokens.space[1],
      end: nativeTokens.space[1],
      width: nativeTokens.space[6],
      height: nativeTokens.space[6],
      borderRadius: nativeTokens.radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accent600,
    },
    actions: {
      flexDirection: "row",
      gap: nativeTokens.space[2],
    },
    errorText: {
      color: c.danger,
      fontSize: nativeTokens.type.scale.small.size,
      fontFamily: nativeTokens.type.family.sans,
    },
  });
}

export type StylesSheet = ReturnType<typeof makeStyles>;

export function useStyles(): StylesSheet {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}

// expo-router colocation: not a screen.
export default (): null => null;
