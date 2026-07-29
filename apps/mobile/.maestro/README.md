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
# terminal 1 — emulator already booted; this brings up everything else
pnpm --filter @baydar/mobile e2e:device-up

# terminal 2
pnpm --filter @baydar/mobile e2e:shots

# subsets
pnpm --filter @baydar/mobile e2e:shots -- --only=feed,me --locale=ar-PS --theme=dark
```

The script sets `adb reverse` for 8081 and 4000 itself — without those the
device reaches neither Metro nor the API and every screen shoots an offline
state. Override the output directory with `QA_SHOTS_OUT`, and the adb binary
with `ADB` if it is not at the default SDK path.

`QA_ACCOUNT` (default `demo@baydar.ps`) picks the account every id is resolved
from, and it must match whoever the device is signed in as — `set-appearance`
deliberately does not `clearState`, so the session persists across the run. The
three employer screens only exist for an account with a company: `demo` has
none, so they are skipped with a note. Use `QA_ACCOUNT=owner@baydar.ps` to
capture them.

The web twin is `apps/web/e2e/shots.mjs` (46 routes × 2 locales × 2 themes ×
2 viewports); keep the two in step when routes are added.

## Getting a current build onto the emulator

`../e2e/device-up.mjs` is the one command between a booted emulator and a
rendering app. It stays in the foreground and owns the API, Metro and a bundle
proxy; Ctrl-C takes all three down. It exists because three separate blockers
sit between "the code is merged" and "the screen is on the emulator", and each
one presents as a bug in your change:

1. **A dev client older than the RN it runs red-boxes with
   `Compiling JS failed: <line>:<col>:')' expected`.** That is the APK's Hermes
   failing to compile a current bundle, not a syntax error in your code — an
   hour went into debugging perfectly good JS before that was understood.
   `device-up` compares the APK's install age against `pnpm-lock.yaml`'s mtime
   and refuses to start, printing the rebuild command. (Ages, not timestamps:
   the emulator's clock is on a different timezone than the host.)
2. **This emulator cannot receive Metro's bundle.** RN asks for
   `Accept: multipart/mixed`; OkHttp then dies on the chunked multipart with
   `ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd`, and
   the plain path dies at 13–17MB with `unexpected end of stream`. Metro is
   innocent — `curl` pulls the identical response cleanly on the host. So
   `device-up` builds a ~5.5MB `expo export:embed --dev false` artifact and a
   small proxy answers `*.bundle` from disk with a real `Content-Length`.
   The proxy has to own **8081**: the dev client persists `10.0.2.2:8081` and
   ignores the `?url=` it was launched with, and `10.0.2.2` bypasses
   `adb reverse`. Metro moves to 8083.
3. **Without the local API the app parks on "نحتاج التأكد من ملفك".** `device-up`
   starts it from `.env.qa.local` and sets `adb reverse tcp:4000`.

Rebuilding the dev client itself still needs the short-path worktree, because
the pnpm store pushes native object paths past CMake's limit under the normal
worktree base:

```bash
git worktree add --detach C:\b HEAD
# copy .npmrc (virtual-store-dir-max-length=50) and apps/mobile/.env into C:\b
cd C:\b && pnpm install
cd apps/mobile && npx expo run:android   # ~3 minutes
```

Do not reach for the release variant: `RelWithDebInfo` object paths are longer
than `Debug` by just enough to blow that same CMake limit, so it cannot build
here at all.

Bundled **raster assets** come from the installed APK, not from the served
bundle — adding a new bundled image needs a native rebuild, not just a
`device-up`.

## CI

Not wired into CI. A previous `mobile-e2e.yml` scaffold was deleted
(ponytail audit 4): it verified a preview-build URL secret but never
downloaded the APK and booted no emulator, so it could not pass. Add a
real workflow (emulator + APK install + `maestro test`) once the EAS
preview pipeline exists; these flows stay runnable locally meanwhile.
