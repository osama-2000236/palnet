import {
  Button,
  Input as NativeInput,
  Surface,
  nativeTokens,
  type InputProps,
} from "@baydar/ui-native";
import { Controller, type Control, type FieldPath } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import type { OnboardingFormValues } from "./types";

export function ControlledField({
  control,
  name,
  label,
  hint,
  error,
  normalize,
  testID,
  multiline,
  ...props
}: {
  control: Control<OnboardingFormValues>;
  name: FieldPath<OnboardingFormValues>;
  label: string;
  hint?: string;
  error?: unknown;
  normalize?: (value: string) => string;
  testID: string;
} & Omit<
  InputProps,
  "value" | "onChangeText" | "error" | "errorMessage" | "helperText"
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
            fullWidth
            testID={testID}
            accessibilityLabel={label}
            value={String(value ?? "")}
            onBlur={onBlur}
            onChangeText={(next) => onChange(normalize ? normalize(next) : next)}
            multiline={multiline}
            error={Boolean(error)}
            errorMessage={error ? String(error) : undefined}
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
      selectable
      accessibilityRole="alert"
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

export function StepDots({ count, active }: { count: number; active: number }): JSX.Element {
  return (
    <View
      accessibilityElementsHidden
      style={{ flexDirection: "row", justifyContent: "center", gap: nativeTokens.space[1] }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            width: index === active ? nativeTokens.space[6] : nativeTokens.space[2],
            height: nativeTokens.space[2],
            borderRadius: nativeTokens.radius.full,
            backgroundColor:
              index === active ? nativeTokens.color.brand600 : nativeTokens.color.surfaceSunken,
          }}
        />
      ))}
    </View>
  );
}

export function StateMessage({
  tone,
  message,
}: {
  tone: "danger" | "warning";
  message: string;
}): JSX.Element {
  return (
    <Surface
      variant="tinted"
      padding="3"
      accessibilityRole={tone === "danger" ? "alert" : "text"}
      style={{
        backgroundColor:
          tone === "danger" ? nativeTokens.color.dangerSoft : nativeTokens.color.warningSoft,
      }}
    >
      <Text
        selectable
        style={{
          color: tone === "danger" ? nativeTokens.color.danger : nativeTokens.color.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.small.size,
          lineHeight: nativeTokens.type.scale.small.line,
          textAlign: "right",
        }}
      >
        {message}
      </Text>
    </Surface>
  );
}

export function ChoiceButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): JSX.Element {
  return (
    <Button
      variant={selected ? "primary" : "secondary"}
      size="md"
      style={{ flex: 1 }}
      accessibilityState={{ selected }}
      onPress={onPress}
    >
      {label}
    </Button>
  );
}
