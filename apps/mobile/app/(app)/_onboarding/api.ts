import {
  EducationBody,
  ExperienceBody,
  JobLocationMode,
  PersonSuggestion,
  Profile as ProfileSchema,
  type PersonSuggestion as PersonSuggestionDto,
  type Profile,
} from "@baydar/shared";
import { z } from "zod";

import { apiFetch, ApiRequestError } from "@/lib/api";
import type { PickedAsset } from "@/lib/uploads";
import { uploadAsset } from "@/lib/uploads";
import type { OnboardingFormValues } from "./types";

export const SuggestionsSchema = z.array(PersonSuggestion);
export type { PersonSuggestionDto };

const RawSchema = z.object({}).passthrough();

// Onboarding is also the resume path for a half-filled profile (and for a seeded
// account that never had a background entry), so start from what the profile
// already holds rather than a blank form. Anything already typed wins.
// `getCurrent` is a getter, not a value: the form is live during the fetch, so
// reading it before the await would discard anything typed while it was in flight.
export async function resumeValues(
  email: string,
  token: string,
  getCurrent: () => OnboardingFormValues,
): Promise<OnboardingFormValues> {
  const saved = await apiFetch("/profiles/me", ProfileSchema, { token }).catch(() => null);
  const current = getCurrent();
  return {
    ...current,
    firstName: current.firstName || saved?.firstName || "",
    lastName: current.lastName || saved?.lastName || "",
    handle: current.handle || saved?.handle || toHandle(email.split("@")[0] ?? ""),
    headline: current.headline || saved?.headline || "",
    about: current.about || saved?.about || "",
    location: current.location || saved?.location || "",
    country: current.country || saved?.country || "PS",
  };
}

export async function persistOnboarding({
  values,
  avatarAsset,
  selectedSuggestionIds,
  token,
}: {
  values: OnboardingFormValues;
  avatarAsset: PickedAsset | null;
  selectedSuggestionIds: Set<string>;
  token: string;
}): Promise<Profile> {
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
    try {
      const uploaded = await uploadAsset({ asset: avatarAsset, purpose: "AVATAR", token });
      profile = await apiFetch("/profiles/me", ProfileSchema, {
        method: "PATCH",
        token,
        body: { avatarUrl: uploaded.publicUrl },
      });
    } catch (error) {
      if (!isOptionalAvatarUploadError(error)) throw error;
    }
  }

  profile =
    values.backgroundKind === "work"
      ? await addWork(values, token)
      : await addEducation(values, token);

  if (selectedSuggestionIds.size > 0) {
    await Promise.allSettled(
      Array.from(selectedSuggestionIds).map((receiverId) =>
        apiFetch("/connections", RawSchema, {
          method: "POST",
          token,
          body: { receiverId, message: values.networkMessage.trim() || undefined },
        }),
      ),
    );
  }

  return profile;
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

function isOptionalAvatarUploadError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.status === 429 || error.status === 503 || error.code === "MEDIA_NOT_CONFIGURED";
  }
  return false;
}

async function addWork(values: OnboardingFormValues, token: string): Promise<Profile> {
  return apiFetch("/profiles/me/experiences", ProfileSchema, {
    method: "POST",
    token,
    body: ExperienceBody.parse({
      title: values.workTitle.trim(),
      companyName: values.companyName.trim(),
      companyId: null,
      location: values.location.trim(),
      locationMode: JobLocationMode.ONSITE,
      startDate: new Date(Date.UTC(Number(values.workStartYear), 0, 1)).toISOString(),
      endDate: null,
      description: values.workDescription.trim() || null,
    }),
  });
}

async function addEducation(values: OnboardingFormValues, token: string): Promise<Profile> {
  return apiFetch("/profiles/me/educations", ProfileSchema, {
    method: "POST",
    token,
    body: EducationBody.parse({
      school: values.school.trim(),
      degree: values.degree.trim() || null,
      fieldOfStudy: values.fieldOfStudy.trim() || null,
      startDate: null,
      endDate: null,
      description: null,
    }),
  });
}

export default () => null;
