import {
  EducationBody,
  ExperienceBody,
  JobLocationMode,
  PersonSuggestion,
  Profile as ProfileSchema,
  type PersonSuggestion as PersonSuggestionDto,
  type Profile,
} from "@baydar/shared";
import { Avatar, Button, Icon, Surface, nativeTokens } from "@baydar/ui-native";
import { yupResolver } from "@hookform/resolvers/yup";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type FieldPath,
  type Resolver,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";
import { z } from "zod";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession, writeProfileCache } from "@/lib/session";
import { uploadAsset, type PickedAsset } from "@/lib/uploads";
import { useNetworkStore } from "@/store/network";

type BackgroundKind = "work" | "education";
type StepKey = "identity" | "profile" | "location" | "background" | "photo" | "network";

interface OnboardingFormValues {
  firstName: string;
  lastName: string;
  identityConfirmed: boolean;
  handle: string;
  headline: string;
  about: string;
  location: string;
  country: string;
  backgroundKind: BackgroundKind;
  workTitle: string;
  companyName: string;
  workStartYear: string;
  workDescription: string;
  school: string;
  degree: string;
  fieldOfStudy: string;
  networkMessage: string;
}

const currentYear = new Date().getFullYear();
const SuggestionsSchema = z.array(PersonSuggestion);
const RawSchema = z.object({}).passthrough();

const onboardingSchema = yup.object({
  firstName: yup
    .string()
    .trim()
    .min(1, "onboarding.validation.required")
    .max(60, "onboarding.validation.nameMax")
    .required("onboarding.validation.required"),
  lastName: yup
    .string()
    .trim()
    .min(1, "onboarding.validation.required")
    .max(60, "onboarding.validation.nameMax")
    .required("onboarding.validation.required"),
  identityConfirmed: yup
    .boolean()
    .oneOf([true], "onboarding.validation.identity")
    .required("onboarding.validation.identity"),
  handle: yup
    .string()
    .trim()
    .lowercase()
    .min(3, "onboarding.validation.handle")
    .max(30, "onboarding.validation.handle")
    .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "onboarding.validation.handle")
    .required("onboarding.validation.required"),
  headline: yup
    .string()
    .trim()
    .min(2, "onboarding.validation.required")
    .max(220, "onboarding.validation.headlineMax")
    .required("onboarding.validation.required"),
  about: yup.string().trim().max(4000, "onboarding.validation.aboutMax").defined(),
  location: yup
    .string()
    .trim()
    .min(2, "onboarding.validation.required")
    .max(120, "onboarding.validation.locationMax")
    .required("onboarding.validation.required"),
  country: yup
    .string()
    .trim()
    .uppercase()
    .matches(/^[A-Z]{2}$/, "onboarding.validation.country")
    .required("onboarding.validation.required"),
  backgroundKind: yup
    .mixed<BackgroundKind>()
    .oneOf(["work", "education"], "onboarding.validation.background")
    .required("onboarding.validation.background"),
  workTitle: yup
    .string()
    .trim()
    .max(120, "onboarding.validation.shortMax")
    .test({
      name: "work-title-required",
      message: "onboarding.validation.required",
      test(value) {
        return this.parent.backgroundKind !== "work" || Boolean(value?.trim());
      },
    }),
  companyName: yup
    .string()
    .trim()
    .max(120, "onboarding.validation.shortMax")
    .test({
      name: "company-required",
      message: "onboarding.validation.required",
      test(value) {
        return this.parent.backgroundKind !== "work" || Boolean(value?.trim());
      },
    }),
  workStartYear: yup
    .string()
    .trim()
    .test({
      name: "work-year",
      message: "onboarding.validation.year",
      test(value) {
        if (this.parent.backgroundKind !== "work") return true;
        const year = Number(value);
        return /^\d{4}$/.test(value ?? "") && year >= 1950 && year <= currentYear;
      },
    }),
  workDescription: yup.string().trim().max(4000, "onboarding.validation.aboutMax").defined(),
  school: yup
    .string()
    .trim()
    .max(120, "onboarding.validation.shortMax")
    .test({
      name: "school-required",
      message: "onboarding.validation.required",
      test(value) {
        return this.parent.backgroundKind !== "education" || Boolean(value?.trim());
      },
    }),
  degree: yup.string().trim().max(120, "onboarding.validation.shortMax").defined(),
  fieldOfStudy: yup.string().trim().max(120, "onboarding.validation.shortMax").defined(),
  networkMessage: yup.string().trim().max(300, "onboarding.validation.networkMessage").defined(),
});

export default function OnboardingScreen(): JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ firstName?: string; lastName?: string }>();
  const isConnected = useNetworkStore((state) => state.isConnected);
  const [stepIndex, setStepIndex] = useState(0);
  const [avatarAsset, setAvatarAsset] = useState<PickedAsset | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<PersonSuggestionDto[]>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const steps = useMemo(
    () =>
      [
        { key: "identity", label: t("onboarding.steps.identity") },
        { key: "profile", label: t("onboarding.steps.profile") },
        { key: "location", label: t("onboarding.steps.location") },
        { key: "background", label: t("onboarding.steps.background") },
        { key: "photo", label: t("onboarding.steps.photo") },
        { key: "network", label: t("onboarding.steps.network") },
      ] satisfies { key: StepKey; label: string }[],
    [t],
  );

  const {
    control,
    getValues,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    defaultValues: {
      firstName: String(params.firstName ?? ""),
      lastName: String(params.lastName ?? ""),
      identityConfirmed: false,
      handle: "",
      headline: "",
      about: "",
      location: "",
      country: "PS",
      backgroundKind: "work",
      workTitle: "",
      companyName: "",
      workStartYear: String(currentYear),
      workDescription: "",
      school: "",
      degree: "",
      fieldOfStudy: "",
      networkMessage: "",
    },
    mode: "onTouched",
    resolver: yupResolver(onboardingSchema) as Resolver<OnboardingFormValues>,
  });

  const backgroundKind = useWatch({ control, name: "backgroundKind" });
  const step = steps[stepIndex]!;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const session = await readSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      if (!mounted || getValues("handle")) return;
      setValue("handle", toHandle(session.user.email.split("@")[0] ?? ""), {
        shouldValidate: true,
      });
    })();
    return () => {
      mounted = false;
    };
  }, [getValues, setValue]);

  const loadSuggestions = useCallback(async (): Promise<void> => {
    if (!isConnected) {
      setSuggestionsError(t("onboarding.network.offline"));
      return;
    }
    if (suggestionsLoading || suggestions.length > 0) return;

    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }

    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const data = await apiFetch("/connections/suggestions?limit=8", SuggestionsSchema, {
        token,
      });
      setSuggestions(data);
    } catch {
      setSuggestionsError(t("onboarding.network.failed"));
    } finally {
      setSuggestionsLoading(false);
    }
  }, [isConnected, suggestions.length, suggestionsLoading, t]);

  useEffect(() => {
    if (step.key === "network") {
      void loadSuggestions();
    }
  }, [loadSuggestions, step.key]);

  async function goNext(): Promise<void> {
    setSubmitError(null);
    const fields = fieldsForStep(step.key, backgroundKind);
    const valid = fields.length === 0 || (await trigger(fields));
    if (!valid) return;
    tapHaptic();
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  }

  function goBack(): void {
    setSubmitError(null);
    tapHaptic();
    setStepIndex((value) => Math.max(value - 1, 0));
  }

  async function pickAvatar(): Promise<void> {
    setPhotoError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(t("onboarding.photo.permission"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const sizeBytes = Math.max(asset.fileSize ?? 1, 1);
    if (sizeBytes > 2 * 1024 * 1024) {
      setPhotoError(t("onboarding.photo.tooLarge"));
      return;
    }

    setAvatarAsset({
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      sizeBytes,
      filename: asset.fileName ?? undefined,
    });
  }

  async function complete(values: OnboardingFormValues): Promise<void> {
    setSubmitError(null);
    if (!isConnected) {
      setSubmitError(t("onboarding.errors.offline"));
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }

    setSubmitting(true);
    try {
      let profile = await apiFetch("/profiles/onboard", ProfileSchema, {
        method: "POST",
        token,
        body: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          handle: toHandle(values.handle),
          headline: values.headline.trim(),
          location: values.location.trim(),
          country: values.country.trim().toUpperCase(),
        },
      });

      if (values.about.trim()) {
        profile = await apiFetch("/profiles/me", ProfileSchema, {
          method: "PATCH",
          token,
          body: { about: values.about.trim() },
        });
      }

      if (avatarAsset) {
        const uploaded = await uploadAsset({ asset: avatarAsset, purpose: "AVATAR", token });
        profile = await apiFetch("/profiles/me", ProfileSchema, {
          method: "PATCH",
          token,
          body: { avatarUrl: uploaded.publicUrl },
        });
      }

      profile =
        values.backgroundKind === "work"
          ? await addWork(values, token)
          : await addEducation(values, token);

      if (selectedSuggestionIds.size > 0) {
        await sendInitialConnections({
          token,
          receiverIds: Array.from(selectedSuggestionIds),
          message: values.networkMessage.trim() || undefined,
        });
      }

      await writeProfileCache(profile);
      successHaptic();
      router.replace("/(app)/feed");
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setSubmitError(apiErrorMessage(t, error));
      } else {
        setSubmitError(t("onboarding.errors.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleInvalid(nextErrors: FieldErrors<OnboardingFormValues>): void {
    setSubmitError(t("onboarding.validation.review"));
    const firstStep = steps.findIndex((item) =>
      fieldsForStep(item.key, backgroundKind).some((field) => nextErrors[field]),
    );
    if (firstStep >= 0) setStepIndex(firstStep);
  }

  return (
    <SafeAreaView
      testID="onboarding-screen"
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            padding: nativeTokens.space[4],
            gap: nativeTokens.space[4],
          }}
        >
          <View style={{ gap: nativeTokens.space[2] }}>
            <Text
              selectable
              style={{
                color: nativeTokens.color.brand600,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.caption.size,
                fontWeight: "700",
                lineHeight: nativeTokens.type.scale.caption.line,
                textAlign: "right",
              }}
            >
              {t("onboarding.progress", { current: stepIndex + 1, total: steps.length })}
            </Text>
            <Text
              selectable
              style={{
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.display.size,
                fontWeight: "700",
                lineHeight: nativeTokens.type.scale.display.line,
                textAlign: "right",
              }}
            >
              {step.label}
            </Text>
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
              {t(`onboarding.stepCopy.${step.key}`)}
            </Text>
          </View>

          <StepDots count={steps.length} active={stepIndex} />

          {!isConnected ? <StateMessage tone="warning" message={t("onboarding.offline")} /> : null}

          <Surface variant="hero" padding="5" style={{ gap: nativeTokens.space[4] }}>
            {step.key === "identity" ? (
              <IdentityStep control={control} errors={errors} />
            ) : step.key === "profile" ? (
              <ProfileStep control={control} errors={errors} />
            ) : step.key === "location" ? (
              <LocationStep control={control} errors={errors} />
            ) : step.key === "background" ? (
              <BackgroundStep
                control={control}
                errors={errors}
                backgroundKind={backgroundKind}
                setBackgroundKind={(value) =>
                  setValue("backgroundKind", value, { shouldDirty: true, shouldValidate: true })
                }
              />
            ) : step.key === "photo" ? (
              <PhotoStep
                avatarAsset={avatarAsset}
                photoError={photoError}
                onPick={pickAvatar}
                onRemove={() => {
                  setPhotoError(null);
                  setAvatarAsset(null);
                }}
              />
            ) : (
              <NetworkStep
                control={control}
                errors={errors}
                suggestions={suggestions}
                loading={suggestionsLoading}
                error={suggestionsError}
                selectedIds={selectedSuggestionIds}
                onRetry={loadSuggestions}
                onToggle={(userId) => {
                  setSelectedSuggestionIds((current) => {
                    const next = new Set(current);
                    if (next.has(userId)) next.delete(userId);
                    else next.add(userId);
                    return next;
                  });
                }}
              />
            )}
          </Surface>

          {submitError ? <StateMessage tone="danger" message={submitError} /> : null}

          <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
            {stepIndex > 0 ? (
              <Button
                variant="secondary"
                size="lg"
                disabled={submitting}
                style={{ flex: 1 }}
                accessibilityLabel={t("onboarding.back")}
                onPress={goBack}
              >
                {t("onboarding.back")}
              </Button>
            ) : null}
            <Button
              size="lg"
              loading={submitting}
              disabled={submitting || (isLastStep && !isConnected)}
              style={{ flex: 1 }}
              testID={isLastStep ? "onboarding-submit" : "onboarding-next"}
              accessibilityLabel={isLastStep ? t("onboarding.submit") : t("common.continue")}
              onPress={isLastStep ? handleSubmit(complete, handleInvalid) : goNext}
            >
              {isLastStep ? t("onboarding.submit") : t("common.continue")}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function IdentityStep({
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

function ProfileStep({
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

function LocationStep({
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

function BackgroundStep({
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

function PhotoStep({
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

function NetworkStep({
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

function ControlledField({
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
} & TextInputProps): JSX.Element {
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
          <TextInput
            {...props}
            testID={testID}
            accessibilityLabel={label}
            value={String(value ?? "")}
            onBlur={onBlur}
            onChangeText={(next) => onChange(normalize ? normalize(next) : next)}
            multiline={multiline}
            placeholderTextColor={nativeTokens.color.inkSubtle}
            textAlign={props.keyboardType === "email-address" ? "left" : "right"}
            style={[
              {
                minHeight: multiline ? nativeTokens.space[20] : nativeTokens.chrome.minHit,
                borderWidth: 1,
                borderColor: error ? nativeTokens.color.danger : nativeTokens.color.lineHard,
                borderRadius: nativeTokens.radius.md,
                backgroundColor: nativeTokens.color.surface,
                color: nativeTokens.color.ink,
                paddingHorizontal: nativeTokens.space[3],
                paddingVertical: nativeTokens.space[2],
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
                textAlignVertical: multiline ? "top" : "center",
              },
              props.style,
            ]}
          />
          {hint ? (
            <Text
              selectable
              style={{
                color: nativeTokens.color.inkSubtle,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.caption.size,
                lineHeight: nativeTokens.type.scale.caption.line,
                textAlign: "right",
              }}
            >
              {hint}
            </Text>
          ) : null}
          {error ? <FieldError message={String(error)} /> : null}
        </View>
      )}
    />
  );
}

function FieldError({ message }: { message: string }): JSX.Element {
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

function StepDots({ count, active }: { count: number; active: number }): JSX.Element {
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

function StateMessage({
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

function ChoiceButton({
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

function fieldsForStep(
  step: StepKey,
  backgroundKind: BackgroundKind,
): FieldPath<OnboardingFormValues>[] {
  if (step === "identity") return ["firstName", "lastName", "identityConfirmed"];
  if (step === "profile") return ["handle", "headline", "about"];
  if (step === "location") return ["location", "country"];
  if (step === "background") {
    return backgroundKind === "work"
      ? ["backgroundKind", "workTitle", "companyName", "workStartYear", "workDescription"]
      : ["backgroundKind", "school", "degree", "fieldOfStudy"];
  }
  if (step === "network") return ["networkMessage"];
  return [];
}

async function addWork(values: OnboardingFormValues, token: string): Promise<Profile> {
  const parsed = ExperienceBody.parse({
    title: values.workTitle.trim(),
    companyName: values.companyName.trim(),
    companyId: null,
    location: values.location.trim(),
    locationMode: JobLocationMode.ONSITE,
    startDate: yearToIso(values.workStartYear),
    endDate: null,
    description: values.workDescription.trim() || null,
  });
  return apiFetch("/profiles/me/experiences", ProfileSchema, {
    method: "POST",
    token,
    body: parsed,
  });
}

async function addEducation(values: OnboardingFormValues, token: string): Promise<Profile> {
  const parsed = EducationBody.parse({
    school: values.school.trim(),
    degree: values.degree.trim() || null,
    fieldOfStudy: values.fieldOfStudy.trim() || null,
    startDate: null,
    endDate: null,
    description: null,
  });
  return apiFetch("/profiles/me/educations", ProfileSchema, {
    method: "POST",
    token,
    body: parsed,
  });
}

async function sendInitialConnections({
  token,
  receiverIds,
  message,
}: {
  token: string;
  receiverIds: string[];
  message?: string;
}): Promise<void> {
  await Promise.allSettled(
    receiverIds.map((receiverId) =>
      apiFetch("/connections", RawSchema, {
        method: "POST",
        token,
        body: { receiverId, message },
      }),
    ),
  );
}

function yearToIso(year: string): string {
  return new Date(Date.UTC(Number(year), 0, 1)).toISOString();
}

function toHandle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}
