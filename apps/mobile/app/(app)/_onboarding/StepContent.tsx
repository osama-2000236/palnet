import { Surface, nativeTokens } from "@baydar/ui-native";
import type { Control, FieldErrors, UseFormSetValue } from "react-hook-form";

import type { PickedAsset } from "@/lib/uploads";

import { NetworkStep } from "./NetworkStep";
import {
  BackgroundStep,
  IdentityStep,
  LocationStep,
  PhotoStep,
  ProfileStep,
} from "./Steps";
import type { PersonSuggestionDto } from "./api";
import type { BackgroundKind, OnboardingFormValues, StepKey } from "./types";

export function StepContent({
  avatarAsset,
  backgroundKind,
  control,
  errors,
  onPickAvatar,
  onRemoveAvatar,
  onRetrySuggestions,
  onToggleSuggestion,
  photoError,
  selectedSuggestionIds,
  setValue,
  step,
  suggestions,
  suggestionsError,
  suggestionsLoading,
}: {
  avatarAsset: PickedAsset | null;
  backgroundKind: BackgroundKind;
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  onPickAvatar: () => Promise<void>;
  onRemoveAvatar: () => void;
  onRetrySuggestions: () => Promise<void>;
  onToggleSuggestion: (userId: string) => void;
  photoError: string | null;
  selectedSuggestionIds: Set<string>;
  setValue: UseFormSetValue<OnboardingFormValues>;
  step: StepKey;
  suggestions: PersonSuggestionDto[];
  suggestionsError: string | null;
  suggestionsLoading: boolean;
}): JSX.Element {
  return (
    <Surface padding="5" variant="hero" style={{ gap: nativeTokens.space[4] }}>
      {step === "identity" ? (
        <IdentityStep control={control} errors={errors} />
      ) : step === "profile" ? (
        <ProfileStep control={control} errors={errors} />
      ) : step === "location" ? (
        <LocationStep control={control} errors={errors} />
      ) : step === "background" ? (
        <BackgroundStep
          backgroundKind={backgroundKind}
          control={control}
          errors={errors}
          setBackgroundKind={(value) =>
            setValue("backgroundKind", value, { shouldDirty: true, shouldValidate: true })
          }
        />
      ) : step === "photo" ? (
        <PhotoStep
          avatarAsset={avatarAsset}
          photoError={photoError}
          onPick={onPickAvatar}
          onRemove={onRemoveAvatar}
        />
      ) : (
        <NetworkStep
          control={control}
          error={suggestionsError}
          errors={errors}
          loading={suggestionsLoading}
          selectedIds={selectedSuggestionIds}
          suggestions={suggestions}
          onRetry={onRetrySuggestions}
          onToggle={onToggleSuggestion}
        />
      )}
    </Surface>
  );
}
