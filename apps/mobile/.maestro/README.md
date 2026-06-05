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

The `.github/workflows/mobile-e2e.yml` workflow runs all flows via
`workflow_dispatch` only — full Android emulator + EAS build chain is
expensive enough that we don't gate every PR on it. Promote to a
nightly cron once the fixture pipeline is stable. Closes #8 in scaffold
form.
