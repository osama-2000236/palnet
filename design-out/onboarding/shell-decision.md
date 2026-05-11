# Shell decision — bare, not `AppShell`

## Decision

Onboarding renders **without `AppShell`**. No top nav, no bottom tab bar, no search pill, no left/right rails. Only:

1. Logo top-left (and only on web; mobile has the bare safe-area header).
2. `OnboardingProgress` strip at the top of the centered column.
3. The step's content (max-width 480 web, full-width with 16px padding mobile).
4. One primary action.

## Why bare wins

- Onboarding is the only authenticated screen the user **must** finish before the rest of the app works. The API guard `PROFILE_ONBOARDING_REQUIRED` 403s every other tab until the profile exists.
- Showing the full shell implies "feel free to navigate away." That contradicts the guard. The user would tap the bell, get a 403, tap back. Bad first impression.
- The focused single-purpose layout makes the verb obvious: "Complete this, then continue."
- The bare shell is the same shell used for the auth flow (`/login`, `/register`, `/reset-password`). The user already saw it once. Consistency.

## Why not `AppShell` with disabled tabs

Considered: render `AppShell` but disable / gray out every tab except the one the user is on. Rejected:

- Disabled-but-visible chrome is worse than absent chrome — it teases content the user can't reach.
- The visual treatment for "disabled tab" doesn't exist in the design system. Inventing one for one screen is bad ROI.
- Mobile bottom tabs can't be disabled gracefully on Android; we'd have to hide them anyway.

## Why not a third "onboarding shell" component

Considered: a new `OnboardingShell` primitive in `@baydar/ui-web` / `@baydar/ui-native`. Rejected:

- It would be a thin wrapper over `<main>` with a centered column. The page route already does this.
- The only piece that is genuinely shared across steps is the progress strip — and that lives in `OnboardingProgress`, which is the actual new primitive in this PR.
- A new shell would tempt later contributors to add chrome ("just one little quick-help link in the top-right"). The bare shell stays bare _because_ nothing wraps it.

## When this decision could change

- If onboarding grows beyond 5 steps and the user starts feeling lost between them, revisit. A persistent "current step" header would then justify a real shell.
- If we add a "save and finish later" feature (we don't have one), the bare shell would need a back-to-feed escape hatch. That changes the contract; revisit then.
- If a future onboarding step ever needs the search pill or notification bell to be visible, the shell decision is broken and we should redesign the step rather than restore the shell.

## Implementation pointers

- Web: `apps/web/src/app/[locale]/(app)/layout.tsx` already detects onboarding routes via `isBareAppRoute()` and skips `<AppShell>`. The new sub-routes (`/onboarding/connect`) should be matched by the same check.
- Mobile: `apps/mobile/app/(app)/_layout.tsx` hides the bottom tab bar when `pathname.startsWith("/onboarding")`. Same rule applies to the new sub-routes.
