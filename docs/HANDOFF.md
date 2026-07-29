# HANDOFF — live status

The one status document. Rewritten in place, not appended to — if you want history, use
`git log`, `gh pr list --state all`, and `CHANGELOG.md`. Last verified against `main` on 2026-07-30.

Read order: `CLAUDE.md` → `project-spec.md` → `DESIGN.md` → `BRAND.md` → this file.

## Fresh clone

Run `pnpm --filter @baydar/db db:generate` immediately after `pnpm install`, **before**
`type-check` or `test`. Skipping it fails the whole gate with a misleading
`TS2305: no exported member 'PrismaClient'`.

## State of the code

Feature-complete against `project-spec.md`, including monetization UI, admin moderation and
billing surfaces, Redis-backed rate limiting and SSE fanout, live FX overlay, and the Resend mail
transport. The dependency stack is current (see the upgrade section below). What stands between
this and real users is not code — it is the provisioning below, plus evidence nobody has
gathered yet.

The round-2 review (`review/opus5-round-2`, 2026-07-25) closed three P1s that no gate could have
caught: Karama points could be minted by toggling an application's hire status, the points
checkout could be charged twice, and web SSE never reconnected after any dropped connection.
Findings and corrections: [`docs/audit/OPUS5-ROUND2-2026-07-25.md`](audit/OPUS5-ROUND2-2026-07-25.md).
Screen scores: [`docs/audit/OPUS5-RUBRIC-2026-07-25.md`](audit/OPUS5-RUBRIC-2026-07-25.md).
Arabic copy review list: [`docs/audit/ARABIC-REGISTER-2026-07-25.md`](audit/ARABIC-REGISTER-2026-07-25.md).

## Platform upgrade — done, PRs #109–#120

The features were finished; the platform under them was one to three majors behind on every axis,
two foundations were past end of life, and web and mobile had drifted into two implementations of
one client. That is closed.

**Current on every axis the repo controls:** Node 24, ESLint 9 flat config, Zod 4, Prisma 6,
NestJS 11, next-intl 4, Next 16 (Turbopack), Tailwind 4.

**Deduplicated:** one HTTP client, one set of resource hooks and one string catalog in
`packages/shared`, consumed by both platforms. Mobile SSE reconnects — it never did, which was the
same P1 the round-2 review had fixed on web only.

**Five gates exist that did not**, each a root `scripts/*.mjs` in the lint job with a ledger of
known exceptions that fails when an entry goes stale: `check:i18n` (cross-platform copy drift, dead
keys, and — since 2026-07-30 — a ratchet on keys that exist on one platform only),
`check:ui-lockstep` (ui-web ↔ ui-native pairing, **ledger at 0 entries** as of 2026-07-30),
`packages/config/__tests__/rtl-rules` (the RTL eslint selectors, run against known-bad source),
the shared api-client spec, and `check:security-headers`. `check:native-versions` and
`test:gates` (`scripts/__tests__/`, the gates' own tests) joined the lint job on 2026-07-30;
`check:native-versions` had never run in CI at all.

**Blocked upstream — verified against the packages, not assumed:**

|              | Blocker                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jest 30      | `jest-expo@57`, the latest, still depends on the Jest 29 toolchain. Not gated on the Expo upgrade, as the plan had assumed.                                            |
| ESLint 10    | `eslint-plugin-import`, latest, caps at 9.                                                                                                                             |
| Prisma 7     | Rejects `datasource.url` in the schema. Needs `prisma.config.ts` plus a driver adapter — a rewire of the production DB connection, and its own PR with a staging soak. |
| Expo 54 → 57 | Needs the physical-device smoke run below. Do not ship it on emulator evidence.                                                                                        |

**Design-system drift is at zero.** `check:ui-lockstep` reported 3 known drift entries for three
sprints and had never shrunk; it reports **0** as of 2026-07-30, and `docs/design/PARITY.md`'s
"mounted by nothing" table is empty. Closed by converging `Checkbox` onto `Switch`'s prop
vocabulary, merging native `StateMessage` into one `Alert` on both platforms, giving web the
`SearchField` it never had (and deleting `AppShellSearch`), wiring `OnboardingProgress` and the
`block` illustration kit into the mobile screens that should always have used them, and deleting
what nothing mounted — native `Dialog`, the `outline` illustration kit on native, and the
`ToastHost` alias on both. Every remaining one-platform component now carries a written reason.

**Device evidence for the `Tabs` underline — captured 2026-07-29**, closing the caveat PARITY.md
attached to it. Pixel 7 Pro emulator (1440×3120, ~3.5×), Arabic RTL, light. Sampled from the PNGs
rather than eyeballed: on `/search` the active tab's label is `#1a1a17` (`ink`) over a `#526030`
(`brand600`) underline spanning y=732–738 — 7px, i.e. the specified 2dp — while inactive labels are
`#5c5a52` (`inkMuted`) with no underline above the strip's `#e8e7e4` border, which is `lineSoft`
composited over `surfaceMuted`. `/in/demo` reproduces it exactly (underline y=1605–1611). `/network`
and `/messages` confirmed visually. Every strip rendered on **one row**; wrapping is now structurally
impossible because the strip is a horizontal `ScrollView`.

Getting there took ~90 minutes of rediscovering three unrelated blockers, each of which presents as
a bug in your own change. That is now one command — `pnpm --filter @baydar/mobile e2e:device-up`
(`apps/mobile/e2e/device-up.mjs`), which refuses to run against a dev client older than the
lockfile, builds and serves the bundle from disk because this emulator cannot receive Metro's, and
starts the API. Rationale for each workaround, and the rebuild recipe for the dev client itself:
`apps/mobile/.maestro/README.md` §"Getting a current build onto the emulator".

## Launch blockers

All of these need an account, a credential, or a human that only the owner can supply. Verified
2026-07-25 against the files cited.

`apps/api/src/config/env.ts:76-146` hard-fails production boot when any of these is unset, so the
production API cannot start until they are provisioned:

| Needs                                                      | Who supplies                                                  | Evidence                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `CORS_ORIGINS`, `BAYDAR_WEB_URL`, `INTERNAL_CRON_TOKEN`    | owner (Render/Vercel env)                                     | `env.ts:84,103,106`                                                                           |
| `RESEND_API_KEY` + `MAIL_FROM`                             | owner (Resend account)                                        | `env.ts:94-99`; transport already built at `modules/mail/resend.transport.ts`                 |
| `HYPERPAY_ENTITY_ID` / `_ACCESS_TOKEN` / `_WEBHOOK_SECRET` | owner (HyperPay merchant onboarding)                          | `env.ts:111-117`. Until then bank transfer and Karama points are the only real payment paths. |
| `BANK_TRANSFER_IBAN` + `_BENEFICIARY`                      | owner (bank)                                                  | `env.ts:124-127`                                                                              |
| `CLAMAV_SCAN_URL` + `CLOUDFLARE_IMAGES_SCAN_URL`           | owner (stand up the scanners, or relax the gate deliberately) | `env.ts:134-137`                                                                              |
| `SENTRY_DSN` + `SENTRY_RELEASE`                            | owner (Sentry project)                                        | `env.ts:143-145`                                                                              |

Not env-gated at boot, but still owner-supplied:

| Needs                                                                                                                      | Who supplies                        | Evidence                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BAYDAR_APPLE_TEAM_ID`, `BAYDAR_ANDROID_SHA256_CERT_FINGERPRINTS`                                                          | owner (Apple / Play consoles)       | routes are built and env-driven at `apps/web/src/app/.well-known/{apple-app-site-association,assetlinks.json}/route.ts`; they emit nothing useful until these are set |
| EAS project id + signing credentials, production PostHog values                                                            | owner (Expo / PostHog)              | `check:release-production` gate                                                                                                                                       |
| Confirm both Render crons exist live with `INTERNAL_CRON_TOKEN` set                                                        | owner (Render dashboard)            | defined at `render.yaml:53,69` — account retention daily 03:00, karama decay monthly 1st 04:00                                                                        |
| Real staging API hostname                                                                                                  | owner                               | lives only inside the `RENDER_STAGING_DEPLOY_HOOK` secret; record it in `docs/deployment.md` so pre-flight steps 6–7 can run                                          |
| Real-device smoke evidence — refresh, deep links, push, haptics, offline/SSE resume, swipe archive, cross-device messaging | owner (physical devices)            | owed since Sprint 11.5                                                                                                                                                |
| Native-speaker Arabic copy review                                                                                          | human reviewer                      | 47 colloquial strings collected in `docs/audit/ARABIC-REGISTER-2026-07-25.md`; 30 are on product-facing member surfaces, not the landing page as previously recorded  |
| Legal / privacy counsel review                                                                                             | counsel                             | `apps/web/src/app/[locale]/(public)/legal/legal-copy.tsx` is v0.1 placeholder copy                                                                                    |
| Staging perf baseline                                                                                                      | owner (needs the staging URL above) | `pnpm load:api:baseline` vs `docs/perf-baseline-*.md`                                                                                                                 |

## Deploy

Push to `main` runs gate → staging migrate (Neon) → Render staging hook + Vercel preview
(`.github/workflows/deploy.yml`). Production only via manual `workflow_dispatch` with
`target=production`. The owner has no Vercel CLI or token locally, so production ships through the
workflow, never a local push. Pre-flight checklist and rollback: `docs/deployment.md`.

## Hard borders

`CLAUDE.md` is law: tokens only, RTL-safe logical CSS, Arabic-first, web↔mobile lockstep,
framework-neutral `ui-*`, no viewer-scoped public caching, no placeholder production routes, SSE
stays the realtime transport, design work routes to `design-handoff-2026-06/`.
