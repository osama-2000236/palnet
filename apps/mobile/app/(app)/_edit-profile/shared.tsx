import { Input as NativeInput, Surface } from "@baydar/ui-native";
import type { Profile } from "@baydar/shared";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

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
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  error?: string | null;
  inputDirection?: "rtl" | "ltr" | "auto";
}): JSX.Element {
  return (
    <NativeInput
      fullWidth
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
      accessibilityLabel={placeholder}
      accessibilityHint={error ?? undefined}
      error={Boolean(error)}
      errorMessage={error ?? undefined}
      inputStyle={[
        inputDirection === "ltr"
          ? styles.inputLtr
          : inputDirection === "auto"
            ? styles.inputAuto
            : styles.inputRtl,
        multiline ? styles.multilineInput : null,
      ]}
    />
  );
}

export function parseDateInput(value: string): string | null {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}
