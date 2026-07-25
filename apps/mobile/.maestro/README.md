# Maestro smoke flows

Opt-in E2E flows that exercise the critical mobile paths. Run them
against a local Expo dev build or an EAS preview build before tagging a
release.

## Flows

- `login-to-feed.yaml` — onboarding skip → login form → feed shell.
- `compose-post.yaml` — login → composer modal → optimistic insert.
- `send-message.yaml` — login → first room → send message → assert echo.
- `register.yaml` — landing CTA → register (unique email per run) → mandatory onboarding.
- `search.yaml` — feed search entry → query → result tabs render.
- `apply-to-job.yaml` — jobs list → first job → apply (skipped if already applied) → applied badge.
- `profile-edit.yaml` — me tab → edit profile → basics card renders.

All flows assume the completed local QA fixture user
`qa+qa-android-0520.0000@baydar.test` (password `Password123`) and at least
one existing DM thread with the messaging companion account.

`demo@baydar.ps` no longer routes to mandatory onboarding — the seed gives it a
headline, a location, and one experience, which satisfies `isProfileComplete`
(`packages/shared/src/profile-completion.ts`). Verified 2026-07-25; older docs
saying otherwise are stale.

## Running locally

```bash
# Install once
curl -Ls "https://get.maestro.mobile.dev" | bash

# Seed completed local QA accounts once per database reset.
pnpm --filter @baydar/db qa:load-fixture --run-id=qa-android-0520 --users=2

# Launch the Expo dev build on an emulator first, then:
cd apps/mobile
maestro test .maestro/login-to-feed.yaml
maestro test .maestro/compose-post.yaml
maestro test .maestro/send-message.yaml
```

## Screenshot harness

`../e2e/shots.mjs` walks all 38 Expo Router screens across
{ar-PS, en} × {light, dark} — 152 PNGs into the gitignored
`apps/mobile/.qa-shots/`. It navigates with `adb am start` against the
`baydar://` scheme and captures with `adb exec-out screencap`, so it needs no
dependency beyond the Android SDK. `set-appearance.yaml` is the one place
Maestro is involved: switching theme and locale means tapping a specific
segment, and only Maestro can do that by testID.

```bash
# 1. emulator running with the dev client (ps.baydar.app) installed
# 2. API on :4000  ->  node scripts/run-api-local.mjs .env.qa.local
# 3. Metro         ->  pnpm --filter @baydar/mobile start
node apps/mobile/e2e/shots.mjs

# subsets
node apps/mobile/e2e/shots.mjs --only=feed,me --locale=ar-PS --theme=dark
```

The script sets `adb reverse` for 8081 and 4000 itself — without those the
device reaches neither Metro nor the API and every screen shoots an offline
state. Override the output directory with `QA_SHOTS_OUT`, and the adb binary
with `ADB` if it is not at the default SDK path.

The web twin is `apps/web/e2e/shots.mjs` (46 routes × 2 locales × 2 themes ×
2 viewports); keep the two in step when routes are added.

## CI

Not wired into CI. A previous `mobile-e2e.yml` scaffold was deleted
(ponytail audit 4): it verified a preview-build URL secret but never
downloaded the APK and booted no emulator, so it could not pass. Add a
real workflow (emulator + APK install + `maestro test`) once the EAS
preview pipeline exists; these flows stay runnable locally meanwhile.
