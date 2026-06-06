import { StyleSheet } from "react-native";

import { nativeTokens } from "@baydar/ui-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
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
