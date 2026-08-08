import { useMemo } from "react";

import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";

export function makeStyles(c: NativeTheme["color"]) {
  return {
    screen: { flex: 1, backgroundColor: c.surfaceMuted },
    title: {
      color: c.ink,
      fontSize: nativeTokens.type.scale.h1.size,
      lineHeight: nativeTokens.type.scale.h1.line,
      fontWeight: "700" as const,
      fontFamily: nativeTokens.type.family.sans,
    },
    section: {
      color: c.ink,
      fontSize: nativeTokens.type.scale.h3.size,
      fontWeight: "600" as const,
      fontFamily: nativeTokens.type.family.sans,
      marginBottom: nativeTokens.space[2],
    },
    body: {
      color: c.ink,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      fontFamily: nativeTokens.type.family.body,
    },
    muted: {
      color: c.inkMuted,
      fontSize: nativeTokens.type.scale.small.size,
      fontFamily: nativeTokens.type.family.sans,
    },
    fieldLabel: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      fontWeight: "600" as const,
    },
    hint: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
    },
    coverLetterInput: {
      minHeight: 140,
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      textAlignVertical: "top" as const,
    },
    inlineError: {
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.danger,
      borderRadius: nativeTokens.radius.md,
      paddingHorizontal: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[2],
    },
    inlineErrorText: {
      color: c.danger,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
    },
    formActions: {
      flexDirection: "row" as const,
      justifyContent: "flex-end" as const,
      gap: nativeTokens.space[2],
      marginTop: nativeTokens.space[1],
    },
    logoBox: {
      width: nativeTokens.space[8] + nativeTokens.space[6],
      height: nativeTokens.space[8] + nativeTokens.space[6],
      borderRadius: nativeTokens.radius.md,
      backgroundColor: c.surfaceSunken,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      overflow: "hidden" as const,
    },
    logoFallback: {
      color: c.inkMuted,
      fontWeight: "600" as const,
      fontSize: nativeTokens.type.scale.h2.size,
      fontFamily: nativeTokens.type.family.sans,
    },
    appliedBadge: {
      alignSelf: "flex-start" as const,
      paddingHorizontal: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[2],
      borderRadius: nativeTokens.radius.md,
      backgroundColor: c.successSoft,
    },
    appliedBadgeText: {
      color: c.success,
      fontSize: nativeTokens.type.scale.small.size,
      fontWeight: "700" as const,
      fontFamily: nativeTokens.type.family.sans,
    },
    // The chip itself is the kit's `Chip`; this only lays the row out.
    skillsRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: nativeTokens.space[1],
    },
  };
}

export type StylesSheet = ReturnType<typeof makeStyles>;

export function useStyles(): StylesSheet {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
