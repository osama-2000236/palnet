import {
  Button,
  Input as NativeInput,
  nativeTokens,
  type InputProps,
  useThemeTokens,
} from "@baydar/ui-native";
import { Controller, type Control, type FieldPath } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { I18nManager, Text, View } from "react-native";

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
  const c = useThemeTokens().color;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onBlur, onChange, value } }) => (
        <View style={{ gap: nativeTokens.space[1] }}>
          <Text
            selectable
            style={{
              color: c.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
              fontWeight: "700",
              lineHeight: nativeTokens.type.scale.small.line,
              textAlign: "auto",
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
                ? // eslint-disable-next-line no-restricted-syntax -- email is always LTR.
                  { textAlign: "left", writingDirection: "ltr" }
                : {
                    textAlign: "auto",
                    writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
                  },
              {
                minHeight: multiline ? nativeTokens.space[20] : nativeTokens.chrome.minHit,
                color: c.ink,
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
  const c = useThemeTokens().color;
  const { t } = useTranslation();

  return (
    <Text
      accessibilityRole="alert"
      selectable
      style={{
        color: c.danger,
        fontFamily: nativeTokens.type.family.sans,
        fontSize: nativeTokens.type.scale.caption.size,
        lineHeight: nativeTokens.type.scale.caption.line,
        textAlign: "auto",
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
