import { Profile, type AuthSession, type Profile as ProfileDto } from "@baydar/shared";

import { apiFetch, ApiRequestError } from "./api";
import { clearProfileCache, readProfileCache, writeProfileCache } from "./session";

export type ProfileStatus =
  | { status: "complete"; profile: ProfileDto | null; source: "api" | "cache" }
  | { status: "required"; profile: null; source: "api" | "cache" };

export async function fetchProfileStatus(token: string): Promise<ProfileStatus> {
  try {
    const profile = await apiFetch("/profiles/me", Profile, { token });
    if (!isProfileComplete(profile)) {
      await clearProfileCache();
      return { status: "required", profile: null, source: "api" };
    }
    await writeProfileCache(profile);
    return { status: "complete", profile, source: "api" };
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 404 || error.code === "NOT_FOUND")) {
      await clearProfileCache();
      return { status: "required", profile: null, source: "api" };
    }
    throw error;
  }
}

export function isProfileComplete(profile: ProfileDto): boolean {
  const hasIdentity = Boolean(
    profile.firstName.trim() &&
      profile.lastName.trim() &&
      profile.handle.trim() &&
      profile.headline?.trim() &&
      profile.location?.trim(),
  );
  const hasBackground = profile.experiences.length > 0 || profile.educations.length > 0;
  return hasIdentity && hasBackground;
}

export async function cachedProfileStatus(userId: string): Promise<ProfileStatus | null> {
  const cache = await readProfileCache(userId);
  if (!cache) return null;
  return { status: "complete", profile: null, source: "cache" };
}

export async function resolvePostAuthRoute(
  session: AuthSession,
): Promise<"/(app)/feed" | "/(app)/onboarding"> {
  try {
    const status = await fetchProfileStatus(session.tokens.accessToken);
    return status.status === "complete" ? "/(app)/feed" : "/(app)/onboarding";
  } catch (error) {
    const cached = await cachedProfileStatus(session.user.id);
    if (cached?.status === "complete") return "/(app)/feed";
    throw error;
  }
}
