// Which status-bar style a route wants.
//
// The redesign put an olive band on most screens, so light icons are the
// default and the exceptions are the few screens that still sit on paper.
//
// This is decided per FOCUSED route rather than declaratively per screen
// because expo-router `Tabs` keeps every tab mounted: a `<StatusBar>` rendered
// inside a screen resolves by mount order, not by what the user is looking at,
// so the feed's band painted light icons over the profile tab's paper.
//
// EXACT matches, never `includes`. The first cut tested `pathname.includes("/me")`
// and swept in `/me/edit` and `/me/karama` — both band screens — putting dark
// icons on olive. `src/__tests__/status-bar-routes.test.ts` derives this list
// from which route files actually render an `<AppBand>`, so a new screen cannot
// break it silently.

/** Routes that render NO `AppBand`, and therefore sit on paper. */
export const BANDLESS_ROUTES = new Set([
  "/onboarding",
  "/me",
  "/me/premium",
  "/me/connections",
  // The settings sub-screens were never converted — they had no AppHeader to
  // replace, so they are still paper and still need dark icons.
  "/settings/account",
  "/settings/appearance",
  "/settings/blocked",
  "/settings/notifications",
  "/settings/privacy",
  "/settings/security",
  // (auth) and the launch gate are paper too, and the ROOT layout — the one
  // owner — is the only layout that sees them.
  "/",
  "/login",
  "/register",
  "/forgot-password",
]);

export type BarStyle = "light-content" | "dark-content";

/** Light on the olive band, dark on paper. Unknown routes assume a band. */
export function barStyleFor(pathname: string): BarStyle {
  return BANDLESS_ROUTES.has(pathname) ? "dark-content" : "light-content";
}
