import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "@baydar/shared";

// Bumped to baydar.* on rename from palnet.* (pre-launch, no migration).
const KEY = "baydar.session.v1";
const DEVICE_KEY = "baydar.deviceId";

export async function readSession(): Promise<AuthSession | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function writeSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return (await readSession())?.tokens.accessToken ?? null;
}

export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_KEY);
  if (existing) return existing;
  // SecureStore disallows "-" in some platforms? It's safe. Use timestamp + random.
  const id = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_KEY, id);
  return id;
}
