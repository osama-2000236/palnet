// Theme store — owns the user's choice and the resolved scheme. Drives:
//   • the native ThemeProvider (token-based atoms, via `scheme`)
//   • the StatusBar style (consumed in app/_layout.tsx)
//
// Light is the default; persistence lives in src/lib/theme.ts.

import { create } from "zustand";

import type { ColorScheme } from "@baydar/ui-native";

import {
  getInitialThemeChoice,
  readThemeChoice,
  resolveScheme,
  writeThemeChoice,
  type ThemeChoice,
} from "@/lib/theme";

interface ThemeState {
  choice: ThemeChoice;
  scheme: ColorScheme;
  /** Set + persist the choice. */
  setChoice: (choice: ThemeChoice) => void;
  /** Load the persisted choice (async on native). Call once on boot. */
  hydrate: () => Promise<void>;
  /** Recompute the scheme when the OS appearance changes while in "system". */
  syncSystem: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialThemeChoice();

  return {
    choice: initial,
    scheme: resolveScheme(initial),
    setChoice: (choice) => {
      set({ choice, scheme: resolveScheme(choice) });
      // A bare `void` here swallowed persistence failures outright: the theme
      // flipped on screen, never reached storage, and every restart went back to
      // light with nothing logged anywhere.
      void writeThemeChoice(choice).catch((error: unknown) => {
        console.warn("[theme] could not persist appearance choice", error);
      });
    },
    hydrate: async () => {
      const stored = await readThemeChoice();
      if (stored) {
        set({ choice: stored, scheme: resolveScheme(stored) });
      }
    },
    syncSystem: () => {
      if (get().choice === "system") {
        set({ scheme: resolveScheme("system") });
      }
    },
  };
});
