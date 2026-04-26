import type { AuthSession } from "@baydar/shared";

const KEY = "palnet.session.v1";
const DEVICE_KEY = "palnet.deviceId";

export async function readSession(): Promise<AuthSession | null> {
  const raw = globalThis.localStorage?.getItem(KEY) ?? null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function writeSession(session: AuthSession): Promise<void> {
  globalThis.localStorage?.setItem(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  globalThis.localStorage?.removeItem(KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return (await readSession())?.tokens.accessToken ?? null;
}

export async function getDeviceId(): Promise<string> {
  const existing = globalThis.localStorage?.getItem(DEVICE_KEY);
  if (existing) return existing;
  // SecureStore disallows "-" in some platforms? It's safe. Use timestamp + random.
  const id = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  globalThis.localStorage?.setItem(DEVICE_KEY, id);
  return id;
}
