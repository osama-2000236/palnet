export interface ProfileCompletionInput {
  firstName?: string | null;
  lastName?: string | null;
  handle?: string | null;
  headline?: string | null;
  location?: string | null;
  experiences?: readonly unknown[] | null;
  educations?: readonly unknown[] | null;
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
