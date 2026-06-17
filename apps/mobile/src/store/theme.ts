// Theme store — owns the user's choice and the resolved scheme. Drives:
//   • the native ThemeProvider (token-based atoms, via `scheme`)
//   • NativeWind's `dark:` utilities + colour-scheme (via colorScheme.set)
//   • the StatusBar style (consumed in app/_layout.tsx)
//
// Light is the default; persistence lives in src/lib/theme.ts.

import { colorScheme as nativeWindColorScheme } from "nativewind";
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

function applyNativeWind(choice: ThemeChoice): void {
  nativeWindColorScheme.set(choice);
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialThemeChoice();
  applyNativeWind(initial);

  return {
    choice: initial,
    scheme: resolveScheme(initial),
    setChoice: (choice) => {
      applyNativeWind(choice);
      void writeThemeChoice(choice);
      set({ choice, scheme: resolveScheme(choice) });
    },
    hydrate: async () => {
      const stored = await readThemeChoice();
      if (stored) {
        applyNativeWind(stored);
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
