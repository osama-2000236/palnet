import { nativeTokens } from "@baydar/ui-native";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  flex: {
    flex: 1,
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: nativeTokens.color.surfaceMuted,
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
    color: nativeTokens.color.ink,
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
  inputRtl: {
    textAlign: "right",
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
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600",
    fontFamily: nativeTokens.type.family.sans,
  },
  itemMeta: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  itemBody: {
    color: nativeTokens.color.ink,
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
    color: nativeTokens.color.ink,
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
