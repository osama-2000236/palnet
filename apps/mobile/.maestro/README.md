# Maestro smoke flows

Three opt-in E2E flows that exercise the critical mobile paths. Run them
against a local Expo dev build or an EAS preview build before tagging a
release.

## Flows

- `login-to-feed.yaml` — onboarding skip → login form → feed shell.
- `compose-post.yaml` — login → composer modal → optimistic insert.
- `send-message.yaml` — login → first room → send message → assert echo.

All flows assume the completed local QA fixture user
`qa+qa-android-0520.0000@baydar.test` (password `Password123`) and at least
one existing DM thread with the messaging companion account. The seed user
`demo@baydar.ps` intentionally routes to mandatory onboarding because it does
not include professional background data.

## Running locally

```bash
# Install once
curl -Ls "https://get.maestro.mobile.dev" | bash

# Seed completed local QA accounts once per database reset.
pnpm --filter @baydar/db qa:load-fixture -- --run-id=qa-android-0520 --users=2

# Launch the Expo dev build on an emulator first, then:
cd apps/mobile
maestro test .maestro/login-to-feed.yaml
maestro test .maestro/compose-post.yaml
maestro test .maestro/send-message.yaml
```

## CI

Not wired into CI. A previous `mobile-e2e.yml` scaffold was deleted
(ponytail audit 4): it verified a preview-build URL secret but never
downloaded the APK and booted no emulator, so it could not pass. Add a
real workflow (emulator + APK install + `maestro test`) once the EAS
preview pipeline exists; these flows stay runnable locally meanwhile.
