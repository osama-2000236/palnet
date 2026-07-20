import { useMemo } from "react";
import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";
import { StyleSheet } from "react-native";

export function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    content: {
      flex: 1,
      paddingHorizontal: nativeTokens.space[4],
      paddingTop: nativeTokens.space[4],
    },
    stack: {
      gap: nativeTokens.space[3],
    },
    separator: {
      height: nativeTokens.space[3],
    },
    footer: {
      paddingVertical: nativeTokens.space[3],
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[3],
    },
    imageBox: {
      width: nativeTokens.space[12],
      height: nativeTokens.space[12],
      borderRadius: nativeTokens.radius.md,
      backgroundColor: c.surfaceSunken,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    textWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      fontWeight: "700",
      textAlign: "right",
    },
    subtitle: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      textAlign: "right",
    },
    description: {
      marginTop: nativeTokens.space[1],
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      textAlign: "right",
    },
    meta: {
      marginTop: nativeTokens.space[1],
      color: c.inkSubtle,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      textAlign: "right",
    },
    removeButton: {
      width: nativeTokens.space[9],
      height: nativeTokens.space[9],
      borderRadius: nativeTokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceSubtle,
    },
    pressed: {
      opacity: 0.84,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}

export type StylesSheet = ReturnType<typeof makeStyles>;

export function useStyles(): StylesSheet {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
