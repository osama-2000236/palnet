"use client";

import type { AuthSession, Profile } from "@baydar/shared";

// We store the current access token in memory to avoid XSS risks from localStorage.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

// Session management
const SESSION_KEY = "baydar.session.v1";

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    // Override the accessToken placeholder with the current one from memory
    const current = getAccessToken();
    if (current !== null) {
      return {
        ...parsed,
        tokens: {
          ...parsed.tokens,
          accessToken: current,
        },
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  // Store session without access token in localStorage to mitigate XSS risks
  const sessionWithoutAccessToken = {
    ...session,
    tokens: {
      ...session.tokens,
      accessToken: "", // Don't store actual access token in localStorage
    },
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(sessionWithoutAccessToken));
  // Set the access token in memory
  setAccessToken(session.tokens.accessToken);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  clearAccessToken();
}

// Stable device identifier so the API can track sessions per device.
export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  const existing = window.localStorage.getItem("baydar.deviceId");
  if (existing) return existing;
  const id = `web-${crypto.randomUUID()}`;
  window.localStorage.setItem("baydar.deviceId", id);
  return id;
}

export function clearDeviceId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("baydar.deviceId");
}

// Profile cache (non-sensitive)
const PROFILE_CACHE_KEY = "baydar.profile-cache.v1";
const PROFILE_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export interface ProfileCompletionCache {
  userId: string;
  handle: string;
  completedAt: string;
  expiresAt: string;
}

export function readProfileCache(): ProfileCompletionCache | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProfileCompletionCache;
    if (!parsed.expiresAt || Number.isNaN(Date.parse(parsed.expiresAt))) return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeProfileCache(profile: Pick<Profile, "userId" | "handle">): void {
  if (typeof window === "undefined") return;
  const cache: ProfileCompletionCache = {
    userId: profile.userId,
    handle: profile.handle,
    completedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PROFILE_CACHE_TTL_MS).toISOString(),
  };
  window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
}

export function clearProfileCache(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_CACHE_KEY);
}
