import type { PersonSuggestion as PersonSuggestionDto } from "@baydar/shared";
import { Avatar, Button, Icon, Surface, nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";

import type { PickedAsset } from "@/lib/uploads";

import { ChoiceButton, ControlledField, FieldError, StateMessage } from "./fields";
import { toHandle } from "./helpers";
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
        control={control}
        name="firstName"
        label={t("auth.firstName")}
        error={errors.firstName?.message}
        textContentType="givenName"
        autoComplete="name-given"
        testID="onboarding-first-name"
      />
      <ControlledField
        control={control}
        name="lastName"
        label={t("auth.lastName")}
        error={errors.lastName?.message}
        textContentType="familyName"
        autoComplete="name-family"
        testID="onboarding-last-name"
      />

      <Controller
        control={control}
        name="identityConfirmed"
        render={({ field: { onChange, value } }) => (
          <View style={{ gap: nativeTokens.space[1] }}>
            <Surface variant="tinted" padding="3">
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: value }}
                accessibilityLabel={t("onboarding.identity.confirm")}
                testID="onboarding-identity-confirm"
                onPress={() => onChange(!value)}
                style={{
                  minHeight: nativeTokens.chrome.minHit,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: nativeTokens.space[3],
                }}
              >
                <Text
                  selectable
                  style={{
                    flex: 1,
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.body,
                    fontSize: nativeTokens.type.scale.small.size,
                    lineHeight: nativeTokens.type.scale.small.line,
                    textAlign: "right",
                  }}
                >
                  {t("onboarding.identity.confirm")}
                </Text>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{
                    false: nativeTokens.color.surfaceSunken,
                    true: nativeTokens.color.brand200,
                  }}
                  thumbColor={value ? nativeTokens.color.brand600 : nativeTokens.color.surface}
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
        control={control}
        name="handle"
        label={t("onboarding.handle")}
        hint={t("onboarding.handleHint", { handle: "your-handle" })}
        error={errors.handle?.message}
        autoCapitalize="none"
        inputMode="text"
        testID="onboarding-handle"
        normalize={toHandle}
      />
      <ControlledField
        control={control}
        name="headline"
        label={t("onboarding.headline")}
        hint={t("onboarding.headlineHint")}
        error={errors.headline?.message}
        testID="onboarding-headline"
      />
      <ControlledField
        control={control}
        name="about"
        label={t("onboarding.about")}
        hint={t("onboarding.aboutHint")}
        error={errors.about?.message}
        multiline
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
        name="location"
        label={t("onboarding.location")}
        hint={t("onboarding.locationHint")}
        error={errors.location?.message}
        textContentType="addressCity"
        testID="onboarding-location"
      />
      <ControlledField
        control={control}
        name="country"
        label={t("onboarding.country")}
        hint={t("onboarding.countryHint")}
        error={errors.country?.message}
        autoCapitalize="characters"
        maxLength={2}
        testID="onboarding-country"
        normalize={(value) => value.toUpperCase()}
      />
    </View>
  );
}

export function BackgroundStep({
  control,
  errors,
  backgroundKind,
  setBackgroundKind,
}: {
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  backgroundKind: BackgroundKind;
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
            name="workTitle"
            label={t("profile.expTitle")}
            error={errors.workTitle?.message}
            testID="onboarding-work-title"
          />
          <ControlledField
            control={control}
            name="companyName"
            label={t("profile.company")}
            error={errors.companyName?.message}
            testID="onboarding-company"
          />
          <ControlledField
            control={control}
            name="workStartYear"
            label={t("onboarding.background.startYear")}
            error={errors.workStartYear?.message}
            keyboardType="number-pad"
            maxLength={4}
            testID="onboarding-work-start-year"
          />
          <ControlledField
            control={control}
            name="workDescription"
            label={t("profile.description")}
            error={errors.workDescription?.message}
            multiline
            testID="onboarding-work-description"
          />
        </View>
      ) : (
        <View style={{ gap: nativeTokens.space[3] }}>
          <ControlledField
            control={control}
            name="school"
            label={t("profile.school")}
            error={errors.school?.message}
            testID="onboarding-school"
          />
          <ControlledField
            control={control}
            name="degree"
            label={t("profile.degree")}
            error={errors.degree?.message}
            testID="onboarding-degree"
          />
          <ControlledField
            control={control}
            name="fieldOfStudy"
            label={t("profile.fieldOfStudy")}
            error={errors.fieldOfStudy?.message}
            testID="onboarding-field-of-study"
          />
        </View>
      )}
    </View>
  );
}

export function PhotoStep({
  avatarAsset,
  photoError,
  onPick,
  onRemove,
}: {
  avatarAsset: PickedAsset | null;
  photoError: string | null;
  onPick: () => Promise<void>;
  onRemove: () => void;
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
          fullWidth
          variant="secondary"
          size="lg"
          accessibilityLabel={t("onboarding.photo.choose")}
          onPress={() => void onPick()}
        >
          {avatarAsset ? t("onboarding.photo.change") : t("onboarding.photo.choose")}
        </Button>
        {avatarAsset ? (
          <Button
            fullWidth
            variant="ghost"
            size="md"
            accessibilityLabel={t("onboarding.photo.remove")}
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
      {photoError ? <StateMessage tone="danger" message={photoError} /> : null}
    </View>
  );
}

function SuggestionRow({
  suggestion,
  selected,
  onPress,
}: {
  suggestion: PersonSuggestionDto;
  selected: boolean;
  onPress: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const name = `${suggestion.user.firstName} ${suggestion.user.lastName}`.trim();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={name}
      testID={`onboarding-suggestion-${suggestion.user.userId}`}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.86 : 1,
      })}
    >
      <Surface
        variant={selected ? "tinted" : "flat"}
        padding="3"
        style={{ flexDirection: "row", alignItems: "center", gap: nativeTokens.space[3] }}
      >
        <Avatar
          size="md"
          user={{
            id: suggestion.user.userId,
            handle: suggestion.user.handle,
            firstName: suggestion.user.firstName,
            lastName: suggestion.user.lastName,
            avatarUrl: suggestion.user.avatarUrl,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text
            selectable
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.h3.size,
              fontWeight: "700",
              lineHeight: nativeTokens.type.scale.h3.line,
              textAlign: "right",
            }}
          >
            {name || suggestion.user.handle}
          </Text>
          {suggestion.user.headline ? (
            <Text
              selectable
              numberOfLines={2}
              style={{
                color: nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
                lineHeight: nativeTokens.type.scale.small.line,
                textAlign: "right",
              }}
            >
              {suggestion.user.headline}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            width: nativeTokens.space[5],
            height: nativeTokens.space[5],
            borderRadius: nativeTokens.radius.sm,
            borderWidth: 1,
            borderColor: selected ? nativeTokens.color.brand600 : nativeTokens.color.lineHard,
            backgroundColor: selected ? nativeTokens.color.brand600 : nativeTokens.color.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? (
            <Icon name="check" size={nativeTokens.space[4]} color={nativeTokens.color.inkInverse} />
          ) : null}
        </View>
        <Text
          selectable
          style={{
            minWidth: nativeTokens.space[16],
            color: selected ? nativeTokens.color.brand700 : nativeTokens.color.inkMuted,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {selected ? t("onboarding.network.selected") : t("onboarding.network.select")}
        </Text>
      </Surface>
    </Pressable>
  );
}

export function NetworkStep({
  control,
  errors,
  suggestions,
  loading,
  error,
  selectedIds,
  onRetry,
  onToggle,
}: {
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  suggestions: PersonSuggestionDto[];
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  onRetry: () => Promise<void>;
  onToggle: (userId: string) => void;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={{ gap: nativeTokens.space[3] }}>
      <ControlledField
        control={control}
        name="networkMessage"
        label={t("onboarding.network.message")}
        hint={t("onboarding.network.messageHint")}
        error={errors.networkMessage?.message}
        multiline
        testID="onboarding-network-message"
      />

      {loading ? (
        <View style={{ paddingVertical: nativeTokens.space[6], alignItems: "center" }}>
          <ActivityIndicator color={nativeTokens.color.brand600} />
          <Text
            selectable
            style={{
              marginTop: nativeTokens.space[2],
              color: nativeTokens.color.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
            }}
          >
            {t("onboarding.network.loading")}
          </Text>
        </View>
      ) : error ? (
        <View style={{ gap: nativeTokens.space[2] }}>
          <StateMessage tone="warning" message={error} />
          <Button variant="secondary" size="md" onPress={() => void onRetry()}>
            {t("common.retry")}
          </Button>
        </View>
      ) : suggestions.length === 0 ? (
        <Surface variant="tinted" padding="4">
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
            {t("onboarding.network.empty")}
          </Text>
        </Surface>
      ) : (
        <View style={{ gap: nativeTokens.space[2] }}>
          {suggestions.map((suggestion) => (
            <SuggestionRow
              key={suggestion.user.userId}
              suggestion={suggestion}
              selected={selectedIds.has(suggestion.user.userId)}
              onPress={() => onToggle(suggestion.user.userId)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
