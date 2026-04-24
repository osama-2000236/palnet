# Maestro E2E — mobile smoke tests

Maestro drives the Expo app on a real simulator/emulator (or device) using
simple YAML flows. We use it for the mobile happy path that Playwright can't
cover (native gestures, RN screens, bottom-tab nav).

## Why Maestro over Detox

- **No native build config** — works against the managed Expo app we already
  ship. Detox would need custom iOS/Android build settings and break EAS.
- **YAML flows, no JS** — one file per scenario, readable by non-engineers.
- **Cloud option** — Maestro Cloud can run the flows on real devices from CI
  later without us maintaining emulator infra.

## Install (local)

```bash
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash
# Windows: see https://maestro.mobile.dev/getting-started/installing-maestro/windows
```

Verify: `maestro --version`.

## Prereqs for every run

1. API running at `http://localhost:4000` with a fresh DB + seed:
   ```bash
   pnpm --filter @palnet/db db:deploy
   pnpm --filter @palnet/db db:seed
   pnpm --filter @palnet/api dev
   ```
2. Expo dev client running and visible on a simulator/emulator:
   ```bash
   pnpm --filter @palnet/mobile start
   ```
   Then press `i` (iOS simulator) or `a` (Android emulator).

## Run

```bash
# Single flow
maestro test .maestro/auth-happy-path.yaml

# Settings: notifications prefs
maestro test .maestro/settings-notifications.yaml

# Settings: sessions list
maestro test .maestro/settings-sessions.yaml

# Compose a text-only post
maestro test .maestro/compose-post.yaml

# Open a profile from search
maestro test .maestro/profile-open.yaml

# Send a direct message
maestro test .maestro/room-send.yaml

# All flows
maestro test .maestro
```

## Writing new flows

- Prefer `id:` selectors (matches React Native `testID`) over `text:` —
  copy changes break text matchers, Arabic vs English also breaks them.
- Keep each flow under 20 steps; split into multiple files when bigger.
- Seed credentials: `demo@palnet.ps` / `Password123`.

## CI

Intentionally **not wired into GitHub Actions yet** — Maestro on Linux
runners needs an Android emulator which is slow/flaky without a paid
runner. Plan: run via Maestro Cloud on PRs touching `apps/mobile/**`
once the flow library grows past three scenarios.
