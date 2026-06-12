import { Input as NativeInput, Surface } from "@baydar/ui-native";
import type { Profile } from "@baydar/shared";
import type { ReactNode } from "react";
import { Text, View, type ViewStyle, type TextStyle } from "react-native";

import { styles } from "./styles";

export interface ProfileCardProps {
  profile: Profile;
  onChanged(next: Profile): void;
  onError(message: string | null): void;
}

export function Card({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <Surface variant="card" padding="4">
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </Surface>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
  error,
  inputDirection = "rtl",
  fullWidth = false,
  maxLength,
  style,
  inputStyle,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  error?: string | null;
  inputDirection?: "rtl" | "ltr" | "auto";
  fullWidth?: boolean;
  maxLength?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}): JSX.Element {
  return (
    <NativeInput
      fullWidth={fullWidth}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
      maxLength={maxLength}
      accessibilityLabel={placeholder}
      accessibilityHint={error ?? undefined}
      error={Boolean(error)}
      errorMessage={error ?? undefined}
      style={style}
      inputStyle={[
        inputDirection === "ltr"
          ? styles.inputLtr
          : inputDirection === "auto"
            ? styles.inputAuto
            : styles.inputRtl,
        multiline ? styles.multilineInput : null,
        inputStyle,
      ].filter(Boolean)}
    />
  );
}

export function parseDateInput(value: string): string | null {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export default () => null;
