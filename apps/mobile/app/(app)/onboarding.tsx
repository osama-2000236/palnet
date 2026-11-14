import {
  PersonSuggestion,
  Profile as ProfileSchema,
  type PersonSuggestion as PersonSuggestionDto,
} from "@baydar/shared";
import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { yupResolver } from "@hookform/resolvers/yup";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { StateMessage, StepDots } from "@/components/onboarding/fields";
import {
  addEducation,
  addWork,
  fieldsForStep,
  sendInitialConnections,
  toHandle,
} from "@/components/onboarding/helpers";
import { defaultOnboardingValues, onboardingSchema } from "@/components/onboarding/schema";
import {
  BackgroundStep,
  IdentityStep,
  LocationStep,
  NetworkStep,
  PhotoStep,
  ProfileStep,
} from "@/components/onboarding/steps";
import type { OnboardingFormValues, StepKey } from "@/components/onboarding/types";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession, writeProfileCache } from "@/lib/session";
import { uploadAsset, type PickedAsset } from "@/lib/uploads";
import { useNetworkStore } from "@/store/network";

const SuggestionsSchema = z.array(PersonSuggestion);

export default function OnboardingScreen(): JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ firstName?: string; lastName?: string }>();
  const isConnected = useNetworkStore((state) => state.isConnected);
  const [stepIndex, setStepIndex] = useState(0);
  const [avatarAsset, setAvatarAsset] = useState<PickedAsset | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<PersonSuggestionDto[]>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [suggestionsRequested, setSuggestionsRequested] = useState(false);
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
    defaultValues: defaultOnboardingValues(
      String(params.firstName ?? ""),
      String(params.lastName ?? ""),
    ),
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

  const loadSuggestions = useCallback(
    async (force = false): Promise<void> => {
      if (suggestionsLoading || (suggestionsRequested && !force)) return;

      setSuggestionsRequested(true);
      if (!isConnected) {
        setSuggestionsError(t("onboarding.network.offline"));
        return;
      }

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
    },
    [isConnected, suggestionsLoading, suggestionsRequested, t],
  );

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
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              padding: nativeTokens.space[4],
              paddingBottom: nativeTokens.space[24] + insets.bottom,
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

            {!isConnected ? (
              <StateMessage tone="warning" message={t("onboarding.offline")} />
            ) : null}

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
                  onRetry={() => loadSuggestions(true)}
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
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              gap: nativeTokens.space[2],
              paddingHorizontal: nativeTokens.space[4],
              paddingTop: nativeTokens.space[3],
              paddingBottom: Math.max(insets.bottom, nativeTokens.space[4]),
              borderTopWidth: 1,
              borderTopColor: nativeTokens.color.lineSoft,
              backgroundColor: nativeTokens.color.surfaceMuted,
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 20,
              elevation: 20,
            }}
          >
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
