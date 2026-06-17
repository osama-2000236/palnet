// Theme context for native atoms. Framework-neutral by design (CLAUDE.md:
// shared UI imports no Expo / app APIs) — this is a CONTROLLED provider: the app
// owns the choice + persistence + system-follow, and passes the resolved
// "light" | "dark" down. Atoms read the active token bundle via useThemeTokens().
//
// The default context value is the LIGHT bundle, so an atom rendered without a
// provider (isolated usage, tests) still resolves real tokens instead of
// throwing or going blank.

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { getNativeTokens, type ColorScheme, type NativeTheme } from "./tokens";

interface ThemeContextValue {
  scheme: ColorScheme;
  tokens: NativeTheme;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: "light",
  tokens: getNativeTokens("light"),
});

export interface ThemeProviderProps {
  scheme: ColorScheme;
  children: ReactNode;
}

export function ThemeProvider({ scheme, children }: ThemeProviderProps): JSX.Element {
  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, tokens: getNativeTokens(scheme) }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Active scheme + token bundle. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Shortcut for the active token bundle. To make an atom theme-aware, replace a
 *  module-scope `nativeTokens` read with `const t = useThemeTokens()` in render. */
export function useThemeTokens(): NativeTheme {
  return useContext(ThemeContext).tokens;
}
