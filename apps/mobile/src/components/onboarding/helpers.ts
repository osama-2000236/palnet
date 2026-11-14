import {
  EducationBody,
  ExperienceBody,
  JobLocationMode,
  Profile as ProfileSchema,
  type Profile,
} from "@baydar/shared";
import type { FieldPath } from "react-hook-form";
import { z } from "zod";

import { apiFetch } from "@/lib/api";

import type { BackgroundKind, OnboardingFormValues, StepKey } from "./types";

const RawSchema = z.object({}).passthrough();

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

export async function addWork(values: OnboardingFormValues, token: string): Promise<Profile> {
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

export async function addEducation(values: OnboardingFormValues, token: string): Promise<Profile> {
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

export async function sendInitialConnections({
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

export function toHandle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}
