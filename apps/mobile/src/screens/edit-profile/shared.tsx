import { Input as NativeInput, Surface } from "@baydar/ui-native";
import type { Profile } from "@baydar/shared";
import type { ReactNode } from "react";
import { Text, View, type ViewStyle, type TextStyle } from "react-native";

import { useStyles } from "./styles";

export interface ProfileCardProps {
  profile: Profile;
  onChanged(next: Profile): void;
  onError(message: string | null): void;
}

export function Card({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  const styles = useStyles();
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
  label,
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
  /** Visible label above the field; defaults to the placeholder so filled fields stay identifiable. */
  label?: string | null;
}): JSX.Element {
  const styles = useStyles();
  const labelText = label === null ? null : (label ?? placeholder);
  const field = (
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
  if (!labelText) return field;
  return (
    <View style={fullWidth ? styles.labeledField : undefined}>
      <Text style={styles.fieldLabel}>{labelText}</Text>
      {field}
    </View>
  );
}

/**
 * Visible label above a control that is not an `Input` — the city picker.
 * It was the only field in the basics card with no label, so a filled picker
 * read as a stray value ("رام الله") with nothing naming it. Web wraps its
 * twin in the same shape (`<Field label={tOn("location")}>`).
 */
export function LabeledField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.labeledField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function parseDateInput(value: string): string | null {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}
