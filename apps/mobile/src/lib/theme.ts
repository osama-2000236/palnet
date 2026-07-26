// Theme preference persistence — mirrors src/lib/locale.ts: SecureStore on
// native, localStorage on web, with a synchronous best-effort initial read.
//
// LIGHT IS THE DEFAULT (DESIGN.md §5). "system" only resolves to dark when the
// user explicitly picks it and the device is in dark mode.

import * as SecureStore from "expo-secure-store";
import { Appearance, Platform } from "react-native";

import type { ColorScheme } from "@baydar/ui-native";

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "baydar.theme.v1";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

type WebStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function getWebStorage(): WebStorage | null {
  return (globalThis as typeof globalThis & { localStorage?: WebStorage }).localStorage ?? null;
}

/** Resolve a choice to a concrete scheme. */
export function resolveScheme(choice: ThemeChoice): ColorScheme {
  if (choice === "system") {
    return Appearance.getColorScheme() === "dark" ? "dark" : "light";
  }
  return choice;
}

function readWeb(): ThemeChoice | null {
  if (Platform.OS !== "web") return null;
  try {
    const raw = getWebStorage()?.getItem(KEY);
    return isThemeChoice(raw) ? raw : null;
  } catch {
    return null;
  }
}

function readNativeSync(): ThemeChoice | null {
  if (Platform.OS === "web") return null;
  try {
    // Synchronous read, exactly as `locale.ts` does. Without it native always
    // booted "light" and restoration depended entirely on the async `hydrate()`
    // effect — which is why a chosen dark theme did not survive a restart.
    const raw = SecureStore.getItem(KEY);
    return isThemeChoice(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Synchronous initial choice, so the first paint is already the right theme. */
export function getInitialThemeChoice(): ThemeChoice {
  return readWeb() ?? readNativeSync() ?? "light";
}

export async function readThemeChoice(): Promise<ThemeChoice | null> {
  if (Platform.OS === "web") return readWeb();
  const raw = await SecureStore.getItemAsync(KEY).catch(() => null);
  return isThemeChoice(raw) ? raw : null;
}

export async function writeThemeChoice(choice: ThemeChoice): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(KEY, choice);
    return;
  }
  await SecureStore.setItemAsync(KEY, choice);
}
