import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { Icon } from "./Icon";
import { nativeTokens } from "./tokens";

export interface SearchFieldProps
  extends Omit<TextInputProps, "style" | "placeholderTextColor" | "onChange"> {
  onClear?: () => void;
  clearLabel?: string;
  containerTestID?: string;
}

export function SearchField({
  value,
  onClear,
  clearLabel = "Clear",
  containerTestID,
  testID,
  accessibilityLabel,
  ...rest
}: SearchFieldProps): JSX.Element {
  const canClear = Boolean(value && onClear);

  return (
    <View testID={containerTestID} style={styles.wrap}>
      <Icon name="search" size={18} color={nativeTokens.color.inkMuted} />
      <TextInput
        {...rest}
        value={value}
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? rest.placeholder}
        placeholderTextColor={nativeTokens.color.inkMuted}
        returnKeyType={rest.returnKeyType ?? "search"}
        style={styles.input}
      />
      {canClear ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          hitSlop={10}
          style={({ pressed }) => [styles.clear, pressed ? styles.pressed : null]}
        >
          <Icon name="x" size={16} color={nativeTokens.color.inkMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: nativeTokens.chrome.minHit,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
    borderRadius: nativeTokens.radius.md,
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    backgroundColor: nativeTokens.color.surface,
    paddingHorizontal: nativeTokens.space[3],
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    textAlign: "right",
    paddingVertical: nativeTokens.space[2],
  },
  clear: {
    width: nativeTokens.space[6],
    height: nativeTokens.space[6],
    borderRadius: nativeTokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
});
