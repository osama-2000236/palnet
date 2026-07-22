import { useMemo } from "react";
import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";
import { StyleSheet } from "react-native";

export function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    flex: {
      flex: 1,
    },
    centerScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceMuted,
    },
    errorWrap: {
      alignSelf: "stretch",
      paddingHorizontal: nativeTokens.space[4],
    },
    scrollContent: {
      padding: nativeTokens.space[4],
      gap: nativeTokens.space[4],
    },
    cardTitle: {
      color: c.ink,
      fontSize: nativeTokens.type.scale.h2.size,
      lineHeight: nativeTokens.type.scale.h2.line,
      fontWeight: "600",
      fontFamily: nativeTokens.type.family.sans,
      marginBottom: nativeTokens.space[3],
    },
    cardBody: {
      gap: nativeTokens.space[2],
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[3],
      marginBottom: nativeTokens.space[1],
    },
    nameGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: nativeTokens.space[2],
    },
    nameCell: {
      flex: 1,
      minWidth: nativeTokens.space[20],
    },
    inputLtr: {
      textAlign: "left",
      writingDirection: "ltr",
    },
    labeledField: {
      alignSelf: "stretch",
    },
    fieldLabel: {
      color: c.inkMuted,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "600",
      fontFamily: nativeTokens.type.family.sans,
      marginBottom: nativeTokens.space[1],
      textAlign: "auto",
    },
    inputRtl: {
      textAlign: "auto",
      writingDirection: "rtl",
    },
    inputAuto: {
      writingDirection: "auto",
    },
    multilineInput: {
      minHeight: nativeTokens.space[20],
      textAlignVertical: "top",
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: nativeTokens.space[3],
      paddingBottom: nativeTokens.space[3],
    },
    itemText: {
      flex: 1,
    },
    itemTitle: {
      color: c.ink,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "600",
      fontFamily: nativeTokens.type.family.sans,
    },
    itemMeta: {
      color: c.inkMuted,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontFamily: nativeTokens.type.family.sans,
    },
    itemBody: {
      color: c.ink,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontFamily: nativeTokens.type.family.body,
      marginTop: nativeTokens.space[1],
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: nativeTokens.space[2],
    },
    skillList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: nativeTokens.space[2],
    },
    skillChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[2],
    },
    skillText: {
      color: c.ink,
      fontSize: nativeTokens.type.scale.small.size,
      fontFamily: nativeTokens.type.family.sans,
    },
    skillInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[2],
    },
    skillInput: {
      flex: 1,
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
