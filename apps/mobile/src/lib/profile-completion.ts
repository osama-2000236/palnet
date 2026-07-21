import type { Profile } from "@baydar/shared";

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
 * Shared by the profile screen and the feed summary card — they were counting
 * the same five booleans in two places, and neither could say what was missing.
 */
export function profileCompletion(profile: Profile): ProfileCompletion {
  const done: Record<CompletionStep, boolean> = {
    avatar: Boolean(profile.avatarUrl),
    headline: Boolean(profile.headline),
    location: Boolean(profile.location),
    experience: profile.experiences.length > 0 || profile.educations.length > 0,
    skills: profile.skills.length > 0,
  };

  return {
    completed: STEPS.filter((step) => done[step]).length,
    total: STEPS.length,
    next: STEPS.find((step) => !done[step]) ?? null,
  };
}
