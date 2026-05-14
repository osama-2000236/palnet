# Onboarding flow — five steps

End-to-end design for the multi-step onboarding flow. Implementation note: the **web route is still a single-step form** today; this doc + the new `OnboardingProgress` primitive set up the migration. The **mobile route is already multi-step** in `apps/mobile/app/(app)/onboarding.tsx`.

## The five steps

1. **Sign up** — create the account. Email + password.
2. **Verify email** — confirm via the token link.
3. **Complete profile** — first name, last name, handle, headline, location.
4. **First connect** — pick at least 2 suggested connections.
5. **Land in feed** — completion screen → push to `/feed`.

Each step is a single screen with one primary verb. The user cannot skip ahead — completion of step N unlocks step N+1.

## Why these five (not more, not fewer)

- **Sign up** is split from **Verify email** because they happen in different sessions. Sign up creates the account; the verify link lands the user back in a new session (potentially on a different device).
- **First connect** earns its own step because seeing real names in the suggestions is the moment the network feels alive. Without it, the user lands in a feed with no one in it.
- **No "upload photo" step.** Photos are optional and the mobile flow already proves you don't need a dedicated screen for them — the profile editor takes a photo with one tap. Don't gate onboarding on a photo.
- **No "interests" step.** Baydar doesn't yet have an interests model. Don't ship a step that does nothing.

## State machine

```
SIGNED_UP        → step 1 done → email sent → step 2
VERIFIED         → step 2 done → /onboarding → step 3
PROFILE_COMPLETE → step 3 done → /onboarding/connect → step 4
CONNECTIONS_SENT → step 4 done → /feed (welcome toast)
```

The `PROFILE_ONBOARDING_REQUIRED` API guard already enforces this on the backend.

## Shell

**Bare shell — no `AppShell`.** Decided per `DESIGN.md §11.1`:

> Onboarding renders without `AppShell` — no top nav, no bottom tab bar, no search pill. Decision rationale: it's the only authenticated screen a user must complete before the rest of the app is usable. Showing the full chrome implies "feel free to navigate away" — but most other tabs 403 with `PROFILE_ONBOARDING_REQUIRED` until onboarding finishes, so navigating away is a dead end.

The bare shell renders:

```
┌─────────────────────────────────────┐
│  Logo (top-left)                    │
│                                     │
│  OnboardingProgress (centered)      │
│  ┌─────────────────────────────┐    │
│  │  Step content (max-w 480)   │    │
│  │  Title + subtitle           │    │
│  │  Form / list                │    │
│  │  Primary action (full-width)│    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

The new `OnboardingProgress` primitive lives at the top of every step screen. On the final completion screen, the progress strip is replaced by an `Illustration motif="notifications"` to mark the "you arrived" moment.

## Per-step content

### Step 1 — Sign up (`/register`)

Already shipped. Form: first name, last name, email, password. Primary action: `Create account`. No `OnboardingProgress` on this screen — it lives in the auth shell.

### Step 2 — Verify email (`/verify-email/[token]`)

Already shipped. One screen showing "tap the link in your email." When the link is opened, the route confirms the token and lands the user on step 3.

### Step 3 — Profile (`/onboarding`)

This is the current single-step web route. Form: handle, first/last name (pre-filled from step 1), headline, location.

**After the multi-step refactor lands:** wrap the existing form in `<OnboardingProgress current={3} total={5} />`. Add a "Continue" button (currently labelled "Save and continue"). On success, route to `/onboarding/connect` instead of `/feed`.

### Step 4 — First connect (`/onboarding/connect`)

New route. Pulls `/connections/suggestions?limit=8`. User picks ≥ 2 by tapping cards. Primary action: `Connect with N people` (count in label). On success, POST those connection requests, then route to `/feed?welcome=1`.

**Empty state:** if `/connections/suggestions` returns zero rows, show `EmptyState motif="network"` with `body = "We'll suggest people as more join Baydar."` and action `Skip for now → /feed`.

### Step 5 — Feed welcome

Not a separate route. `/feed?welcome=1` shows a `Toast` (`kind=success`, message `tAuth("welcome", { name })`) on mount and then strips the query param. No bare shell needed; the feed shell takes over.

## Mobile

Mobile is already multi-step in `apps/mobile/app/(app)/onboarding.tsx`. The new `OnboardingProgress` primitive should replace the existing inline progress strip in that file. Out of scope for this PR (drop-in replacement is mechanical).

## Acceptance for R3 completion

- [x] `OnboardingProgress` primitive shipped on both platforms.
- [x] Shell decision documented (bare — `DESIGN.md §11.1`).
- [x] Flow design + per-step copy direction (this file).
- [x] Onboarding section in `docs/design/SCREENS.md`.
- [ ] Web multi-step migration of the actual `/onboarding` route. **Deferred** — adds three new routes and a state machine. Tracked as a follow-up.
- [ ] Mobile `OnboardingProgress` drop-in. **Deferred** — mechanical replacement; landing in the follow-up.

The follow-up PR replaces the inline mobile progress strip and adds the two new web routes (`/onboarding/connect`, `/feed?welcome=1`). It is gated on this PR's primitive landing first.
