import { StyleSheet } from "react-native";

import { nativeTokens } from "./tokens";

export const makeSafetyStyles = (c: typeof nativeTokens.color) =>
  StyleSheet.create({
    reasonList: {
      gap: nativeTokens.space[2],
    },
    reasonRow: {
      minHeight: nativeTokens.chrome.minHit,
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[2],
      borderWidth: 1,
      borderColor: c.lineSoft,
      borderRadius: nativeTokens.radius.md,
      paddingHorizontal: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[2],
    },
    reasonRowSelected: {
      backgroundColor: c.brand50,
      borderColor: c.brand200,
    },
    radio: {
      width: nativeTokens.space[4],
      height: nativeTokens.space[4],
      borderRadius: nativeTokens.radius.full,
      borderWidth: 1,
      borderColor: c.lineHard,
    },
    radioSelected: {
      backgroundColor: c.brand600,
      borderColor: c.brand600,
    },
    reasonText: {
      flex: 1,
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      textAlign: "auto",
    },
    reasonTextSelected: {
      color: c.brand700,
      fontWeight: "700",
    },
    label: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      fontWeight: "700",
      textAlign: "auto",
    },
    detailsInput: {
      minHeight: nativeTokens.space[24],
      borderWidth: 1,
      borderColor: c.lineHard,
      borderRadius: nativeTokens.radius.md,
      paddingHorizontal: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[2],
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      textAlign: "auto",
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: nativeTokens.space[2],
    },
    blockWrap: {
      alignItems: "flex-start",
      gap: nativeTokens.space[2],
    },
    confirmBox: {
      gap: nativeTokens.space[2],
    },
    confirmTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      fontWeight: "700",
      textAlign: "auto",
    },
    confirmBody: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      textAlign: "auto",
    },
    confirmActions: {
      flexDirection: "row",
      gap: nativeTokens.space[2],
    },
    blockedRow: {
      minHeight: nativeTokens.chrome.minHit,
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[3],
      borderBottomWidth: 1,
      borderBottomColor: c.lineSoft,
      paddingVertical: nativeTokens.space[3],
    },
    blockedText: {
      flex: 1,
      minWidth: 0,
    },
    blockedName: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      fontWeight: "700",
      textAlign: "auto",
    },
    blockedHandle: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.mono,
      fontSize: nativeTokens.type.scale.caption.size,
      writingDirection: "ltr",
    },
    pressed: {
      opacity: 0.88,
    },
  });
