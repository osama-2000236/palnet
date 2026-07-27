export interface ProfileCompletionInput {
  firstName?: string | null;
  lastName?: string | null;
  handle?: string | null;
  headline?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  experiences?: readonly unknown[] | null;
  educations?: readonly unknown[] | null;
  skills?: readonly unknown[] | null;
}

export function isProfileOnboarded(profile: ProfileCompletionInput): boolean {
  return Boolean(
    profile.firstName?.trim() &&
    profile.lastName?.trim() &&
    profile.handle?.trim() &&
    profile.headline?.trim() &&
    profile.location?.trim(),
  );
}

export function isProfileComplete(profile: ProfileCompletionInput): boolean {
  const hasIdentity = isProfileOnboarded(profile);
  const hasBackground =
    (profile.experiences?.length ?? 0) > 0 || (profile.educations?.length ?? 0) > 0;
  return hasIdentity && hasBackground;
}

/** The five things the completion rail counts, in the order we nudge for them. */
const STEPS = ["avatar", "headline", "location", "experience", "skills"] as const;

export type CompletionStep = (typeof STEPS)[number];

export interface ProfileCompletion {
  completed: number;
  total: number;
  /** First unfinished step, or null when the profile is complete. */
  next: CompletionStep | null;
}

/**
 * The web feed card and the mobile profile rail both nudge on these five
 * booleans. They used to count them in two places and drift; this is the one
 * place. Web only reads `completed`/`total`; mobile also uses `next`.
 */
export function profileCompletion(profile: ProfileCompletionInput): ProfileCompletion {
  const done: Record<CompletionStep, boolean> = {
    avatar: Boolean(profile.avatarUrl),
    headline: Boolean(profile.headline),
    location: Boolean(profile.location),
    experience: (profile.experiences?.length ?? 0) > 0 || (profile.educations?.length ?? 0) > 0,
    skills: (profile.skills?.length ?? 0) > 0,
  };

  return {
    completed: STEPS.filter((step) => done[step]).length,
    total: STEPS.length,
    next: STEPS.find((step) => !done[step]) ?? null,
  };
}
