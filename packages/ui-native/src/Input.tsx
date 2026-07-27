// Input — native twin of packages/ui-web/src/Input.tsx.
//
// Same shared prop vocabulary: size / error / errorMessage / helperText /
// leading / trailing / fullWidth. Uses TextInput on native and tokenized
// styles only.

import type { ReactNode } from "react";
import {
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<TextInputProps, "style"> {
  size?: InputSize;
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
  /** Back-compat alias for helperText. */
  helper?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

const SIZE_HEIGHT: Record<InputSize, number> = { sm: 28, md: 36, lg: 44 };
const SIZE_PAD_X: Record<InputSize, number> = { sm: 10, md: 12, lg: 14 };
// Was a raw 13 / 14 / 15. `14` is on neither platform's scale, and web `md`
// resolves to `small`, so this was a parity gap as well as a token one.
const SIZE_FONT: Record<InputSize, number> = {
  sm: nativeTokens.type.scale.small.size,
  md: nativeTokens.type.scale.small.size,
  lg: nativeTokens.type.scale.body.size,
};
const SIZE_LINE: Record<InputSize, number> = {
  sm: nativeTokens.type.scale.small.line,
  md: nativeTokens.type.scale.small.line,
  lg: nativeTokens.type.scale.body.line,
};
const SIZE_GAP: Record<InputSize, number> = { sm: 6, md: 8, lg: 8 };

export function Input({
  size = "md",
  error = false,
  errorMessage,
  helperText,
  helper,
  leading,
  trailing,
  fullWidth = false,
  editable = true,
  style,
  inputStyle,
  placeholderTextColor,
  accessibilityState,
  ...rest
}: InputProps): JSX.Element {
  const disabled = editable === false;
  const message = errorMessage ?? helperText ?? helper;
  const c = useThemeTokens().color;

  // `rows` only matters when the host asked for multiline; a single-line field
  // keeps its fixed control height.
  const rows = rest.multiline ? Math.max(1, rest.numberOfLines ?? 3) : 1;
  const wrapperStyle: ViewStyle = {
    minHeight: rest.multiline
      ? SIZE_LINE[size] * rows + nativeTokens.space[2] * 2
      : SIZE_HEIGHT[size],
    flexDirection: "row",
    // A multiline field's leading icon and caret belong at the top, not
    // vertically centred against a box that grows as the user types.
    alignItems: rest.multiline ? "flex-start" : "center",
    paddingVertical: rest.multiline ? nativeTokens.space[2] : 0,
    gap: SIZE_GAP[size],
    borderRadius: nativeTokens.radius.md,
    borderWidth: 1,
    borderColor: error ? c.danger : c.lineHard,
    backgroundColor: disabled ? c.surfaceSubtle : c.surface,
    paddingHorizontal: SIZE_PAD_X[size],
    opacity: disabled ? 0.65 : 1,
  };

  const fieldStyle: TextStyle = {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: disabled ? c.inkSubtle : c.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: SIZE_FONT[size],
    lineHeight: SIZE_LINE[size],
    textAlign: "auto",
    writingDirection: "auto",
    textAlignVertical: rest.multiline ? "top" : "center",
  };

  return (
    <View style={[{ alignSelf: fullWidth ? "stretch" : "flex-start", gap: 4 }, style]}>
      <View style={wrapperStyle}>
        {leading ? <View pointerEvents="none">{leading}</View> : null}
        <TextInput
          {...rest}
          editable={editable}
          aria-invalid={error || undefined}
          placeholderTextColor={placeholderTextColor ?? c.inkSubtle}
          accessibilityState={{ disabled, ...accessibilityState }}
          style={[fieldStyle, inputStyle]}
        />
        {trailing ? <View pointerEvents="none">{trailing}</View> : null}
      </View>
      {message ? (
        <Text
          selectable
          style={{
            color: errorMessage ? c.danger : c.inkMuted,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
            lineHeight: nativeTokens.type.scale.caption.line,
            textAlign: "auto",
          }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
