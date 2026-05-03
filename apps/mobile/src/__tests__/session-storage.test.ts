import type { AuthSession } from "@baydar/shared";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  clearSession,
  readProfileCache,
  readSession,
  writeProfileCache,
  writeSession,
} from "@/lib/session";

const session: AuthSession = {
  user: {
    id: "clv0000000000000000000000",
    email: "demo@baydar.ps",
    role: "USER",
    locale: "ar-PS",
  },
  tokens: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: new Date().toISOString(),
    refreshExpiresAt: new Date().toISOString(),
  },
};

describe("session storage", () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    setPlatform(originalOs);
    jest.clearAllMocks();
  });

  it("uses browser storage on web instead of native SecureStore", async () => {
    const values = new Map<string, string>();
    setPlatform("web");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    await writeSession(session);

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    await expect(readSession()).resolves.toEqual(session);

    await clearSession();

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    await expect(readSession()).resolves.toBeNull();
  });

  it("treats legacy profile caches without expiry as expired", async () => {
    const values = new Map<string, string>();
    setPlatform("web");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    values.set(
      "baydar.profile-cache.v1",
      JSON.stringify({
        userId: "user-1",
        handle: "demo",
        completedAt: new Date().toISOString(),
      }),
    );

    await expect(readProfileCache("user-1")).resolves.toBeNull();
  });

  it("writes profile caches with expiry", async () => {
    const values = new Map<string, string>();
    setPlatform("web");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    await writeProfileCache({ userId: "user-1", handle: "demo" });

    const cache = await readProfileCache("user-1");
    expect(cache?.expiresAt).toBeTruthy();
  });
});

function setPlatform(os: typeof Platform.OS): void {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    get: () => os,
  });
}
