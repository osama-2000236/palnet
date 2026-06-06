import { StyleSheet } from "react-native";

import { nativeTokens } from "@baydar/ui-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
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
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    fontFamily: nativeTokens.type.family.sans,
  },
  bodyInput: {
    minHeight: nativeTokens.space[20] * 2,
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.body,
  },
  counter: {
    alignSelf: "flex-end",
    color: nativeTokens.color.inkMuted,
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
    backgroundColor: nativeTokens.color.accent600,
  },
  actions: {
    flexDirection: "row",
    gap: nativeTokens.space[2],
  },
  errorText: {
    color: nativeTokens.color.danger,
    fontSize: nativeTokens.type.scale.small.size,
    fontFamily: nativeTokens.type.family.sans,
  },
});
