"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isThemeChoice, THEME_STORAGE_KEY, type ResolvedTheme, type ThemeChoice } from "./theme";

interface ThemeContextValue {
  /** The user's selection: an explicit theme or "system". */
  choice: ThemeChoice;
  /** What "system" actually resolves to right now. */
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveChoice(choice: ThemeChoice): ResolvedTheme {
  if (choice === "system") return prefersDark() ? "dark" : "light";
  return choice;
}

function applyResolved(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  // Light is the default (DESIGN.md §5). The inline boot script in the root
  // layout already applied the stored choice to <html> before paint; here we
  // re-sync React state from storage on mount, then keep <html> in lockstep.
  const [choice, setChoiceState] = useState<ThemeChoice>("light");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeChoice(stored)) setChoiceState(stored);
  }, []);

  useEffect(() => {
    const next = resolveChoice(choice);
    setResolved(next);
    applyResolved(next);
  }, [choice]);

  // While following the system, react to OS-level scheme changes live.
  useEffect(() => {
    if (choice !== "system") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => {
      const next: ResolvedTheme = mq.matches ? "dark" : "light";
      setResolved(next);
      applyResolved(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice): void => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage blocked (private mode) — fall back to in-memory only */
    }
    setChoiceState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ choice, resolved, setChoice }),
    [choice, resolved, setChoice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>.");
  return ctx;
}
