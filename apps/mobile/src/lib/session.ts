import type { AuthSession, Profile } from "@baydar/shared";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Stable Baydar session storage key; no migration needed before launch.
const KEY = "baydar.session.v1";
const DEVICE_KEY = "baydar.deviceId";
const PROFILE_CACHE_KEY = "baydar.profile-cache.v1";

type BrowserStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memoryStorage = new Map<string, string>();

export interface ProfileCompletionCache {
  userId: string;
  handle: string;
  completedAt: string;
}

export async function readSession(): Promise<AuthSession | null> {
  const raw = await getStoredValue(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function writeSession(session: AuthSession): Promise<void> {
  await setStoredValue(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await deleteStoredValue(KEY);
  await clearProfileCache();
}

export async function getAccessToken(): Promise<string | null> {
  return (await readSession())?.tokens.accessToken ?? null;
}

export async function getDeviceId(): Promise<string> {
  const existing = await getStoredValue(DEVICE_KEY);
  if (existing) return existing;
  // SecureStore disallows "-" in some platforms? It's safe. Use timestamp + random.
  const id = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await setStoredValue(DEVICE_KEY, id);
  return id;
}

export async function readProfileCache(userId?: string): Promise<ProfileCompletionCache | null> {
  const raw = await getStoredValue(PROFILE_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProfileCompletionCache;
    if (userId && parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeProfileCache(
  profile: Pick<Profile, "userId" | "handle">,
): Promise<void> {
  const cache: ProfileCompletionCache = {
    userId: profile.userId,
    handle: profile.handle,
    completedAt: new Date().toISOString(),
  };
  await setStoredValue(PROFILE_CACHE_KEY, JSON.stringify(cache));
}

export async function clearProfileCache(): Promise<void> {
  await deleteStoredValue(PROFILE_CACHE_KEY);
}

async function getStoredValue(key: string): Promise<string | null> {
  if (shouldUseBrowserStorage()) {
    return webStorage()?.getItem(key) ?? memoryStorage.get(key) ?? null;
  }
  if (hasSecureStore()) {
    return SecureStore.getItemAsync(key);
  }
  return memoryStorage.get(key) ?? null;
}

async function setStoredValue(key: string, value: string): Promise<void> {
  if (shouldUseBrowserStorage()) {
    const storage = webStorage();
    if (storage) {
      storage.setItem(key, value);
    } else {
      memoryStorage.set(key, value);
    }
    return;
  }
  if (hasSecureStore()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  memoryStorage.set(key, value);
}

async function deleteStoredValue(key: string): Promise<void> {
  if (shouldUseBrowserStorage()) {
    webStorage()?.removeItem(key);
    memoryStorage.delete(key);
    return;
  }
  if (hasSecureStore()) {
    await SecureStore.deleteItemAsync(key);
  }
  memoryStorage.delete(key);
}

function shouldUseBrowserStorage(): boolean {
  const maybeGlobal = globalThis as typeof globalThis & {
    document?: unknown;
    window?: unknown;
  };
  return Platform.OS === "web" || (maybeGlobal.window !== undefined && maybeGlobal.document !== undefined);
}

function hasSecureStore(): boolean {
  return (
    typeof SecureStore.getItemAsync === "function" &&
    typeof SecureStore.setItemAsync === "function" &&
    typeof SecureStore.deleteItemAsync === "function"
  );
}

function webStorage(): BrowserStorage | null {
  const maybeGlobal = globalThis as typeof globalThis & {
    localStorage?: BrowserStorage;
  };

  try {
    const storage = maybeGlobal.localStorage;
    if (!storage) return null;
    const probe = "baydar.storage.probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
