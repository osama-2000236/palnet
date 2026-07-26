import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { Icon } from "./Icon";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface SearchFieldProps extends Omit<
  TextInputProps,
  "style" | "placeholderTextColor" | "onChange"
> {
  onClear?: () => void;
  clearLabel?: string;
  containerTestID?: string;
  inputDirection?: "rtl" | "ltr" | "auto";
}

export function SearchField({
  value,
  onClear,
  clearLabel = "Clear",
  containerTestID,
  inputDirection = "rtl",
  testID,
  accessibilityLabel,
  ...rest
}: SearchFieldProps): JSX.Element {
  const canClear = Boolean(value && onClear);
  const c = useThemeTokens().color;

  return (
    <View
      testID={containerTestID}
      style={[styles.wrap, { borderColor: c.lineSoft, backgroundColor: c.surfaceSubtle }]}
    >
      <Icon name="search" size={18} color={c.inkMuted} />
      <TextInput
        {...rest}
        value={value}
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? rest.placeholder}
        placeholderTextColor={c.inkMuted}
        returnKeyType={rest.returnKeyType ?? "search"}
        style={[
          styles.input,
          { color: c.ink },
          inputDirection === "ltr"
            ? styles.inputLtr
            : inputDirection === "auto"
              ? styles.inputAuto
              : null,
        ]}
      />
      {canClear ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          hitSlop={10}
          style={({ pressed }) => [
            styles.clear,
            pressed ? { backgroundColor: c.surfaceSubtle } : null,
          ]}
        >
          <Icon name="x" size={16} color={c.inkMuted} />
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
    borderRadius: nativeTokens.radius.full,
    borderWidth: 1,
    paddingHorizontal: nativeTokens.space[3],
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    textAlign: "auto",
    writingDirection: "rtl",
    paddingVertical: nativeTokens.space[2],
  },
  inputLtr: {
    // eslint-disable-next-line no-restricted-syntax -- paired with writingDirection ltr: this variant is for content that really is LTR.
    textAlign: "left",
    writingDirection: "ltr",
  },
  inputAuto: {
    writingDirection: "auto",
  },
  clear: {
    width: nativeTokens.space[6],
    height: nativeTokens.space[6],
    borderRadius: nativeTokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {},
});
