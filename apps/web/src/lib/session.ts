"use client";

import type { AuthSession } from "@baydar/shared";

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

const ONBOARDING_HANDOFF_KEY = "baydar.onboarding-handoff.v1";

export interface OnboardingHandoff {
  name?: string;
  createdAt: string;
}

export function writeOnboardingHandoff(input: Pick<OnboardingHandoff, "name"> = {}): void {
  if (typeof window === "undefined") return;
  const handoff: OnboardingHandoff = {
    name: input.name,
    createdAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(ONBOARDING_HANDOFF_KEY, JSON.stringify(handoff));
}

export function readOnboardingHandoff(): OnboardingHandoff | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(ONBOARDING_HANDOFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingHandoff;
  } catch {
    return null;
  }
}

export function clearOnboardingHandoff(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ONBOARDING_HANDOFF_KEY);
}
