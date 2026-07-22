import { Profile as ProfileSchema } from "@baydar/shared";
import { nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiRequestError, apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession, writeProfileCache } from "@/lib/session";
import type { PickedAsset } from "@/lib/uploads";
import { useNetworkStore } from "@/store/network";

import { OnboardingFooter, OnboardingHeader, StateMessage, StepDots } from "./_onboarding/Chrome";
import { StepContent } from "./_onboarding/StepContent";
import {
  SuggestionsSchema,
  persistOnboarding,
  toHandle,
  type PersonSuggestionDto,
} from "./_onboarding/api";
import { fieldsForStep } from "./_onboarding/flow";
import { onboardingSchema } from "./_onboarding/schema";
import {
  defaultOnboardingValues,
  type OnboardingFormValues,
  type StepKey,
} from "./_onboarding/types";

export default function OnboardingScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ firstName?: string; lastName?: string }>();
  const isConnected = useNetworkStore((state) => state.isConnected);
  const submitLockRef = useRef(false);
  const [avatarAsset, setAvatarAsset] = useState<PickedAsset | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<PersonSuggestionDto[]>([]);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsRequested, setSuggestionsRequested] = useState(false);

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
    reset,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    defaultValues: defaultOnboardingValues(params),
    mode: "onTouched",
    resolver: zodResolver(onboardingSchema) as Resolver<OnboardingFormValues>,
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
      // Onboarding is also the resume path for a half-filled profile (and for a
      // seeded account that never had a background entry). Start from whatever
      // the profile already holds instead of a blank form.
      const saved = await apiFetch("/profiles/me", ProfileSchema, {
        token: session.tokens.accessToken,
      }).catch(() => null);
      if (!mounted) return;
      const current = getValues();
      reset({
        ...current,
        firstName: current.firstName || saved?.firstName || "",
        lastName: current.lastName || saved?.lastName || "",
        handle: current.handle || saved?.handle || toHandle(session.user.email.split("@")[0] ?? ""),
        headline: current.headline || saved?.headline || "",
        about: current.about || saved?.about || "",
        location: current.location || saved?.location || "",
      });
    })();
    return () => {
      mounted = false;
    };
  }, [getValues, reset]);

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
    if (step.key === "network") void loadSuggestions();
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
    if (submitLockRef.current) return;
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
    submitLockRef.current = true;
    try {
      const profile = await persistOnboarding({
        avatarAsset,
        selectedSuggestionIds,
        token,
        values,
      });
      await writeProfileCache(profile);
      successHaptic();
      router.replace("/(app)/feed");
    } catch (error) {
      setSubmitError(
        error instanceof ApiRequestError
          ? apiErrorMessage(t, error)
          : t("onboarding.errors.generic"),
      );
    } finally {
      submitLockRef.current = false;
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

  function toggleSuggestion(userId: string): void {
    setSelectedSuggestionIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <SafeAreaView testID="onboarding-screen" style={{ flex: 1, backgroundColor: c.surfaceMuted }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: nativeTokens.space[4],
              paddingBottom: nativeTokens.space[24] + insets.bottom,
              gap: nativeTokens.space[4],
            }}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
          >
            <OnboardingHeader
              active={stepIndex}
              count={steps.length}
              label={step.label}
              step={step.key}
            />
            <StepDots active={stepIndex} count={steps.length} />
            {!isConnected ? (
              <StateMessage message={t("onboarding.offline")} tone="warning" />
            ) : null}
            <StepContent
              avatarAsset={avatarAsset}
              backgroundKind={backgroundKind}
              control={control}
              errors={errors}
              photoError={photoError}
              selectedSuggestionIds={selectedSuggestionIds}
              setValue={setValue}
              step={step.key}
              suggestions={suggestions}
              suggestionsError={suggestionsError}
              suggestionsLoading={suggestionsLoading}
              onPickAvatar={pickAvatar}
              onRemoveAvatar={() => {
                setPhotoError(null);
                setAvatarAsset(null);
              }}
              onRetrySuggestions={() => loadSuggestions(true)}
              onToggleSuggestion={toggleSuggestion}
            />
            {submitError ? <StateMessage message={submitError} tone="danger" /> : null}
          </ScrollView>
          <OnboardingFooter
            bottomInset={insets.bottom}
            isConnected={isConnected}
            isLastStep={isLastStep}
            showBack={stepIndex > 0}
            submitting={submitting}
            onBack={goBack}
            onPrimaryPress={
              isLastStep ? () => void handleSubmit(complete, handleInvalid)() : () => void goNext()
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
