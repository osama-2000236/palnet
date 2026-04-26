"use client";

import type { AuthSession } from "@baydar/shared";

// Bumped to baydar.* on rename from palnet.* (pre-launch, no migration).
const KEY = "baydar.session.v1";

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function getAccessToken(): string | null {
  return readSession()?.tokens.accessToken ?? null;
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
