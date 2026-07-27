// PostCard styles — split out of PostCard.tsx to keep that file under the
// qa:design 300-LOC ceiling. Colours are passed in from the render path
// (useThemeTokens), never read at module scope: lint:tokens rule 4.

import { StyleSheet } from "react-native";

import { nativeTokens } from "./tokens";

export const makeStyles = (c: typeof nativeTokens.color) =>
  StyleSheet.create({
    card: {
      overflow: "hidden",
    },
    headerPressable: {
      paddingHorizontal: nativeTokens.space[4],
      paddingTop: nativeTokens.space[4],
      paddingBottom: nativeTokens.space[2],
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: nativeTokens.space[3],
    },
    authorText: {
      flex: 1,
      minWidth: 0,
    },
    authorName: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
      textAlign: "auto",
    },
    authorMeta: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      textAlign: "auto",
    },
    timestamp: {
      color: c.inkSubtle,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      textAlign: "auto",
    },
    moreWrap: {
      minWidth: nativeTokens.space[8],
      minHeight: nativeTokens.space[8],
      alignItems: "center",
      justifyContent: "center",
    },
    bodyWrap: {
      paddingHorizontal: nativeTokens.space[4],
      paddingBottom: nativeTokens.space[3],
    },
    body: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      textAlign: "auto",
    },
    media: {
      overflow: "hidden",
    },
    stats: {
      minHeight: nativeTokens.space[10],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: nativeTokens.space[4],
      paddingVertical: nativeTokens.space[2],
    },
    reactionPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[1],
      borderRadius: nativeTokens.radius.full,
      backgroundColor: c.brand50,
      paddingHorizontal: nativeTokens.space[2],
      paddingVertical: nativeTokens.space[1],
    },
    statEnd: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[3],
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[1],
    },
    statText: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.mono,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
    },
    actionBar: {
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      flexDirection: "row",
      padding: nativeTokens.space[1],
      gap: nativeTokens.space[1],
    },
    action: {
      flex: 1,
      minHeight: nativeTokens.chrome.minHit,
      borderRadius: nativeTokens.radius.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: nativeTokens.space[1],
      paddingHorizontal: nativeTokens.space[1],
    },
    actionSelected: {
      backgroundColor: c.brand50,
    },
    actionLabel: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      fontWeight: "700",
    },
    actionLabelSelected: {
      color: c.brand700,
    },
    comments: {
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      backgroundColor: c.surfaceSubtle,
      padding: nativeTokens.space[3],
    },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.5,
    },
  });
