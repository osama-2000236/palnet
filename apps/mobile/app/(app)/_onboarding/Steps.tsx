import { Button, Icon, Surface, nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { I18nManager, Pressable, Switch, Text, View } from "react-native";

import type { PickedAsset } from "@/lib/uploads";

import { StateMessage } from "./Chrome";
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
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.body,
                    fontSize: nativeTokens.type.scale.small.size,
                    lineHeight: nativeTokens.type.scale.small.line,
                    textAlign: I18nManager.isRTL ? "right" : "left",
                  }}
                >
                  {t("onboarding.identity.confirm")}
                </Text>
                <Switch
                  thumbColor={value ? nativeTokens.color.brand600 : nativeTokens.color.surface}
                  trackColor={{
                    false: nativeTokens.color.surfaceSunken,
                    true: nativeTokens.color.brand200,
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
  const { t } = useTranslation();

  return (
    <View style={{ gap: nativeTokens.space[3] }}>
      <ControlledField
        control={control}
        error={errors.location?.message}
        hint={t("onboarding.locationHint")}
        label={t("onboarding.location")}
        name="location"
        testID="onboarding-location"
        textContentType="addressCity"
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

export function PhotoStep({
  avatarAsset,
  onPick,
  onRemove,
  photoError,
}: {
  avatarAsset: PickedAsset | null;
  onPick: () => Promise<void>;
  onRemove: () => void;
  photoError: string | null;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={{ alignItems: "center", gap: nativeTokens.space[4] }}>
      <View
        style={{
          width: nativeTokens.space[24],
          height: nativeTokens.space[24],
          borderRadius: nativeTokens.radius.full,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: nativeTokens.color.lineHard,
          backgroundColor: nativeTokens.color.surfaceSubtle,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {avatarAsset ? (
          <Image
            source={{ uri: avatarAsset.uri }}
            contentFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <Icon name="logo" size={nativeTokens.space[12]} color={nativeTokens.color.brand600} />
        )}
      </View>
      <View style={{ alignSelf: "stretch", gap: nativeTokens.space[2] }}>
        <Button
          accessibilityLabel={t("onboarding.photo.choose")}
          fullWidth
          size="lg"
          variant="secondary"
          onPress={() => void onPick()}
        >
          {avatarAsset ? t("onboarding.photo.change") : t("onboarding.photo.choose")}
        </Button>
        {avatarAsset ? (
          <Button
            accessibilityLabel={t("onboarding.photo.remove")}
            fullWidth
            size="md"
            variant="ghost"
            onPress={onRemove}
          >
            {t("onboarding.photo.remove")}
          </Button>
        ) : null}
      </View>
      <Text
        selectable
        style={{
          color: nativeTokens.color.inkMuted,
          fontFamily: nativeTokens.type.family.body,
          fontSize: nativeTokens.type.scale.small.size,
          lineHeight: nativeTokens.type.scale.small.line,
          textAlign: "center",
        }}
      >
        {t("onboarding.photo.hint")}
      </Text>
      {photoError ? <StateMessage message={photoError} tone="danger" /> : null}
    </View>
  );
}

export default () => null;
