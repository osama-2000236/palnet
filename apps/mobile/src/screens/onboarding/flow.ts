import type { FieldPath } from "react-hook-form";

import type { BackgroundKind, OnboardingFormValues, StepKey } from "./types";

export function fieldsForStep(
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
