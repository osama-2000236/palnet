import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";

// Colours come from the active theme, so the sheet is built per scheme rather
// than once at import. Sizing tokens are scheme-independent and stay static.
function makeFeedStyles(c: NativeTheme["color"]) {
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
    iconButton: {
      width: nativeTokens.chrome.minHit,
      height: nativeTokens.chrome.minHit,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: nativeTokens.radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.lineSoft,
    },
    iconButtonActive: {
      backgroundColor: c.accent600,
      borderColor: c.accent600,
    },
    unreadDot: {
      position: "absolute",
      top: -nativeTokens.space[1],
      end: -nativeTokens.space[1],
      minWidth: nativeTokens.space[5],
      height: nativeTokens.space[5],
      borderRadius: nativeTokens.radius.full,
      backgroundColor: c.accent700,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: nativeTokens.space[1],
    },
    unreadText: {
      color: c.inkInverse,
      fontSize: nativeTokens.type.scale.caption.size,
      fontWeight: "700",
      fontFamily: nativeTokens.type.family.sans,
    },
    searchEntry: {
      // flex:1 here collapses AppHeader's auto-height search slot to 0 and the
      // composer card paints over the pill — keep it height-driven.
      minHeight: nativeTokens.chrome.minHit,
      borderRadius: nativeTokens.radius.full,
      borderWidth: 1,
      borderColor: c.lineSoft,
      backgroundColor: c.surfaceSubtle,
      paddingHorizontal: nativeTokens.space[3],
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[2],
    },
    searchText: {
      flex: 1,
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      textAlign: "auto",
    },
    pressed: { opacity: 0.88 },
    composerWrap: { marginBottom: nativeTokens.space[3] },
    jobsEntryWrap: {
      marginBottom: nativeTokens.space[3],
    },
    jobsEntry: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[3],
    },
    jobsIcon: {
      width: nativeTokens.space[10],
      height: nativeTokens.space[10],
      borderRadius: nativeTokens.radius.full,
      backgroundColor: c.brand100,
      alignItems: "center",
      justifyContent: "center",
    },
    jobsText: {
      flex: 1,
      minWidth: 0,
    },
    jobsTitle: {
      color: c.ink,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
      fontFamily: nativeTokens.type.family.sans,
      textAlign: "auto",
    },
    jobsSubtitle: {
      color: c.inkMuted,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontFamily: nativeTokens.type.family.sans,
      textAlign: "auto",
    },
    profileCard: {
      gap: nativeTokens.space[3],
      marginBottom: nativeTokens.space[3],
    },
    profileMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[3],
    },
    profileText: {
      flex: 1,
    },
    profileName: {
      color: c.ink,
      fontSize: nativeTokens.type.scale.h2.size,
      lineHeight: nativeTokens.type.scale.h2.line,
      fontWeight: "700",
      fontFamily: nativeTokens.type.family.sans,
      textAlign: "auto",
    },
    profileHeadline: {
      color: c.inkMuted,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontFamily: nativeTokens.type.family.sans,
      textAlign: "auto",
    },
    profileMeta: {
      color: c.inkSubtle,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      fontFamily: nativeTokens.type.family.sans,
      textAlign: "auto",
    },
    profileFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: nativeTokens.space[2],
    },
    profileProgress: {
      flex: 1,
      color: c.brand700,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      fontWeight: "700",
      fontFamily: nativeTokens.type.family.sans,
      textAlign: "auto",
    },
    errorBox: {
      gap: nativeTokens.space[2],
      marginBottom: nativeTokens.space[3],
      backgroundColor: c.warningSoft,
    },
    // Keeps the last card off the tab bar now that posts scroll the full height.
    listContent: {
      paddingBottom: nativeTokens.space[4],
    },
    skeletonStack: {
      gap: nativeTokens.space[3],
    },
    separator: {
      height: nativeTokens.space[3],
    },
    footerLoading: {
      paddingVertical: nativeTokens.space[4],
    },
  });
}

export type FeedStyles = ReturnType<typeof makeFeedStyles>;

export function useFeedStyles(): FeedStyles {
  const c = useThemeTokens().color;
  return useMemo(() => makeFeedStyles(c), [c]);
}
