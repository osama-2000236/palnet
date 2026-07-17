// Theme primitives shared by the server root layout (boot script) and the
// client ThemeProvider. Keep this module free of "use client" and React so the
// server layout can import the boot-script string without pulling client code.
//
// LIGHT IS THE DEFAULT (DESIGN.md §5). Dark + system are opt-in. The warm-dark
// values live entirely in @baydar/ui-tokens — toggling the `dark` class on
// <html> swaps every CSS variable; nothing here hardcodes a colour.

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "baydar-theme";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

// Inline boot script: runs synchronously as the first child of <body> so the
// `dark` class is on <html> before the browser paints — no flash of light.
// Mirrors the resolve logic in theme-provider.tsx. Defaults to light.
export const themeBootScript = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var c=localStorage.getItem(k);if(c!=="light"&&c!=="dark"&&c!=="system"){c="light";}var d=c==="dark"||(c==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
