import { Button, Input as NativeInput, Surface, nativeTokens, type InputProps } from "@baydar/ui-native";
import { Controller, type Control, type FieldPath } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import type { OnboardingFormValues } from "./types";

export function ControlledField({
  control,
  error,
  hint,
  label,
  multiline,
  name,
  normalize,
  testID,
  ...props
}: {
  control: Control<OnboardingFormValues>;
  error?: unknown;
  hint?: string;
  label: string;
  name: FieldPath<OnboardingFormValues>;
  normalize?: (value: string) => string;
  testID: string;
} & Omit<
  InputProps,
  "error" | "errorMessage" | "helperText" | "onChangeText" | "value"
>): JSX.Element {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onBlur, onChange, value } }) => (
        <View style={{ gap: nativeTokens.space[1] }}>
          <Text
            selectable
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
              fontWeight: "700",
              lineHeight: nativeTokens.type.scale.small.line,
              textAlign: "right",
            }}
          >
            {label}
          </Text>
          <NativeInput
            {...props}
            accessibilityLabel={label}
            error={Boolean(error)}
            errorMessage={error ? String(error) : undefined}
            fullWidth
            helperText={!error ? hint : undefined}
            inputStyle={[
              props.keyboardType === "email-address"
                ? { textAlign: "left", writingDirection: "ltr" }
                : { textAlign: "right", writingDirection: "rtl" },
              {
                minHeight: multiline ? nativeTokens.space[20] : nativeTokens.chrome.minHit,
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
                textAlignVertical: multiline ? "top" : "center",
              },
            ]}
            multiline={multiline}
            testID={testID}
            value={String(value ?? "")}
            onBlur={onBlur}
            onChangeText={(next) => onChange(normalize ? normalize(next) : next)}
          />
        </View>
      )}
    />
  );
}

export function FieldError({ message }: { message: string }): JSX.Element {
  const { t } = useTranslation();

  return (
    <Text
      accessibilityRole="alert"
      selectable
      style={{
        color: nativeTokens.color.danger,
        fontFamily: nativeTokens.type.family.sans,
        fontSize: nativeTokens.type.scale.caption.size,
        lineHeight: nativeTokens.type.scale.caption.line,
        textAlign: "right",
      }}
    >
      {t(message)}
    </Text>
  );
}

export function ChoiceButton({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}): JSX.Element {
  return (
    <Button
      accessibilityState={{ selected }}
      size="md"
      style={{ flex: 1 }}
      variant={selected ? "primary" : "secondary"}
      onPress={onPress}
    >
      {label}
    </Button>
  );
}

export function EmptyState({ message }: { message: string }): JSX.Element {
  return (
    <Surface padding="4" variant="tinted">
      <Text
        selectable
        style={{
          color: nativeTokens.color.inkMuted,
          fontFamily: nativeTokens.type.family.body,
          fontSize: nativeTokens.type.scale.body.size,
          lineHeight: nativeTokens.type.scale.body.line,
          textAlign: "right",
        }}
      >
        {message}
      </Text>
    </Surface>
  );
}
