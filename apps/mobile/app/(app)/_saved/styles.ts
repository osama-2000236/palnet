import { nativeTokens } from "@baydar/ui-native";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
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
    backgroundColor: nativeTokens.color.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    fontWeight: "700",
    textAlign: "right",
  },
  subtitle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    textAlign: "right",
  },
  description: {
    marginTop: nativeTokens.space[1],
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    textAlign: "right",
  },
  meta: {
    marginTop: nativeTokens.space[1],
    color: nativeTokens.color.inkSubtle,
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
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.5,
  },
});
