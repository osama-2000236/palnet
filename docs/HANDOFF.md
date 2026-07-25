# HANDOFF — live status

The one status document. Rewritten in place, not appended to — if you want history, use
`git log`, `gh pr list --state all`, and `CHANGELOG.md`. Last verified against `main` @ `c72e9d6`
on 2026-07-25.

Read order: `CLAUDE.md` → `project-spec.md` → `DESIGN.md` → `BRAND.md` → this file.

## Fresh clone

Run `pnpm --filter @baydar/db db:generate` immediately after `pnpm install`, **before**
`type-check` or `test`. Skipping it fails the whole gate with a misleading
`TS2305: no exported member 'PrismaClient'`.

## State of the code

Feature-complete against `project-spec.md`, including monetization UI, admin moderation and
billing surfaces, Redis-backed rate limiting and SSE fanout, live FX overlay, and the Resend mail
transport. CI is green on `main` and there are no open PRs. What stands between this and real
users is not code — it is the provisioning below, plus evidence nobody has gathered yet.

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
| Native-speaker Arabic copy review                                                                                          | human reviewer                      | —                                                                                                                                                                     |
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
