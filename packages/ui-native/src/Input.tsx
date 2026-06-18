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
const SIZE_FONT: Record<InputSize, number> = { sm: 13, md: 14, lg: 15 };
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

  const wrapperStyle: ViewStyle = {
    minHeight: SIZE_HEIGHT[size],
    flexDirection: "row",
    alignItems: "center",
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
    textAlign: "auto",
    writingDirection: "auto",
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
