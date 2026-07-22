import { Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, Switch, Text, View } from "react-native";

import { CityField } from "@/components/CityField";

import { ChoiceButton, ControlledField, FieldError } from "./Fields";
import { toHandle } from "./api";
import type { BackgroundKind, OnboardingFormValues } from "./types";

export function IdentityStep({
  control,
  errors,
}: {
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
}): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();

  return (
    <View style={{ gap: nativeTokens.space[3] }}>
      <ControlledField
        autoComplete="name-given"
        control={control}
        error={errors.firstName?.message}
        label={t("auth.firstName")}
        name="firstName"
        testID="onboarding-first-name"
        textContentType="givenName"
      />
      <ControlledField
        autoComplete="name-family"
        control={control}
        error={errors.lastName?.message}
        label={t("auth.lastName")}
        name="lastName"
        testID="onboarding-last-name"
        textContentType="familyName"
      />
      <Controller
        control={control}
        name="identityConfirmed"
        render={({ field: { onChange, value } }) => (
          <View style={{ gap: nativeTokens.space[1] }}>
            <Surface padding="3" variant="tinted">
              <Pressable
                accessibilityLabel={t("onboarding.identity.confirm")}
                accessibilityRole="switch"
                accessibilityState={{ checked: value }}
                testID="onboarding-identity-confirm"
                style={{
                  minHeight: nativeTokens.chrome.minHit,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: nativeTokens.space[3],
                }}
                onPress={() => onChange(!value)}
              >
                <Text
                  selectable
                  style={{
                    flex: 1,
                    color: c.ink,
                    fontFamily: nativeTokens.type.family.body,
                    fontSize: nativeTokens.type.scale.small.size,
                    lineHeight: nativeTokens.type.scale.small.line,
                    textAlign: "auto",
                  }}
                >
                  {t("onboarding.identity.confirm")}
                </Text>
                <Switch
                  thumbColor={value ? c.brand600 : c.surface}
                  trackColor={{
                    false: c.surfaceSunken,
                    true: c.brand200,
                  }}
                  value={value}
                  onValueChange={onChange}
                />
              </Pressable>
            </Surface>
            {errors.identityConfirmed?.message ? (
              <FieldError message={String(errors.identityConfirmed.message)} />
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

export function ProfileStep({
  control,
  errors,
}: {
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={{ gap: nativeTokens.space[3] }}>
      <ControlledField
        autoCapitalize="none"
        control={control}
        error={errors.handle?.message}
        hint={t("onboarding.handleHint", { handle: "your-handle" })}
        inputMode="text"
        label={t("onboarding.handle")}
        name="handle"
        normalize={toHandle}
        testID="onboarding-handle"
      />
      <ControlledField
        control={control}
        error={errors.headline?.message}
        hint={t("onboarding.headlineHint")}
        label={t("onboarding.headline")}
        name="headline"
        testID="onboarding-headline"
      />
      <ControlledField
        control={control}
        error={errors.about?.message}
        hint={t("onboarding.aboutHint")}
        label={t("onboarding.about")}
        multiline
        name="about"
        testID="onboarding-about"
      />
    </View>
  );
}

export function LocationStep({
  control,
  errors,
}: {
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
}): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();

  return (
    <View style={{ gap: nativeTokens.space[3] }}>
      <Controller
        control={control}
        name="location"
        render={({ field: { onChange, value } }) => (
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
              {t("onboarding.location")}
            </Text>
            <CityField
              testID="onboarding-location"
              value={String(value ?? "")}
              onChange={onChange}
            />
            {errors.location?.message ? (
              <FieldError message={String(errors.location.message)} />
            ) : null}
          </View>
        )}
      />
      <ControlledField
        autoCapitalize="characters"
        control={control}
        error={errors.country?.message}
        hint={t("onboarding.countryHint")}
        label={t("onboarding.country")}
        maxLength={2}
        name="country"
        normalize={(value) => value.toUpperCase()}
        testID="onboarding-country"
      />
    </View>
  );
}

export function BackgroundStep({
  backgroundKind,
  control,
  errors,
  setBackgroundKind,
}: {
  backgroundKind: BackgroundKind;
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  setBackgroundKind: (value: BackgroundKind) => void;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={{ gap: nativeTokens.space[3] }}>
      <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
        <ChoiceButton
          label={t("onboarding.background.work")}
          selected={backgroundKind === "work"}
          onPress={() => setBackgroundKind("work")}
        />
        <ChoiceButton
          label={t("onboarding.background.education")}
          selected={backgroundKind === "education"}
          onPress={() => setBackgroundKind("education")}
        />
      </View>
      {backgroundKind === "work" ? (
        <View style={{ gap: nativeTokens.space[3] }}>
          <ControlledField
            control={control}
            error={errors.workTitle?.message}
            label={t("profile.expTitle")}
            name="workTitle"
            testID="onboarding-work-title"
          />
          <ControlledField
            control={control}
            error={errors.companyName?.message}
            label={t("profile.company")}
            name="companyName"
            testID="onboarding-company"
          />
          <ControlledField
            control={control}
            error={errors.workStartYear?.message}
            keyboardType="number-pad"
            label={t("onboarding.background.startYear")}
            maxLength={4}
            name="workStartYear"
            testID="onboarding-work-start-year"
          />
          <ControlledField
            control={control}
            error={errors.workDescription?.message}
            label={t("profile.description")}
            multiline
            name="workDescription"
            testID="onboarding-work-description"
          />
        </View>
      ) : (
        <View style={{ gap: nativeTokens.space[3] }}>
          <ControlledField
            control={control}
            error={errors.school?.message}
            label={t("profile.school")}
            name="school"
            testID="onboarding-school"
          />
          <ControlledField
            control={control}
            error={errors.degree?.message}
            label={t("profile.degree")}
            name="degree"
            testID="onboarding-degree"
          />
          <ControlledField
            control={control}
            error={errors.fieldOfStudy?.message}
            label={t("profile.fieldOfStudy")}
            name="fieldOfStudy"
            testID="onboarding-field-of-study"
          />
        </View>
      )}
    </View>
  );
}

export default () => null;
