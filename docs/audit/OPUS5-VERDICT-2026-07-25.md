# OPUS5 launch verdict (2026-07-25)

**Ship with caveats.** The code is not what is holding this back. Every CI gate
is green, the defects this review found are fixed, and the remaining distance to
real users is entirely credentials, accounts, and evidence a human has to
gather. Nothing in `BLOCKED` is an engineering task.

The caveat that matters: no one has run this against a real device or a real
staging URL, and the Arabic copy has never been read by a native speaker. Those
are cheap to close and expensive to skip.

## Gate results

Run on `review/opus5-launch-readiness`, Windows / pnpm 9.12.0 / Node 20.

| Gate                                        | Exit                                           |
| ------------------------------------------- | ---------------------------------------------- |
| `pnpm install --frozen-lockfile`            | 0                                              |
| `pnpm --filter @baydar/db db:generate`      | 0                                              |
| `pnpm lint`                                 | 0                                              |
| `pnpm format:check`                         | 0                                              |
| `pnpm lint:tokens`                          | 0                                              |
| `pnpm qa:design`                            | 0 (11 legacy over-300-LOC warnings, unchanged) |
| `pnpm check:release-placeholders`           | 0                                              |
| `pnpm type-check`                           | 0 (13/13)                                      |
| `pnpm --filter @baydar/db db:deploy`        | 0                                              |
| `pnpm test`                                 | 0 — shared 43, ui-web 79, web 25, api 320      |
| `pnpm --filter @baydar/mobile test`         | 0 — 101                                        |
| `pnpm turbo run build --filter @baydar/web` | 0                                              |
| `pnpm mobile:recovery-check`                | 0                                              |
| `playwright test --workers=1`               | 0 — **51 passed**, 0 failed, 37 skipped        |

Three of these needed a fight, and none of the three was a product defect.
Recording them because each cost real time and will cost it again:

**The build failed once with `Cannot find module './8899.js'`.** The dev server
and the production build were both writing `.next`. Passes from a clean `.next`
with no dev server attached.

**E2E fails hard in parallel — 33 failed, 14 passed — and passes serially.**
`fullyParallel: true` against one shared QA database is the cause; workers stamp
on each other's fixtures. With `--workers=1`: 51 passed, 0 failed. CI gets away
with it today, but this is a latent flake source, and anyone running `pnpm e2e`
locally will conclude the app is broken. Either give each worker its own
schema or set `workers: 1` in the config and say why.

**The one genuine e2e failure was a `BLOCKED` credential, not a bug.**
`billing.spec.ts` bank-transfer checkout got `400 VALIDATION_FAILED: "Bank
transfer is not available yet."` — `BANK_TRANSFER_IBAN` is an empty placeholder
in the local env, and the API deliberately fails closed on an unconfigured bank
destination. That is the fail-closed contract working as designed. Setting a
test IBAN turns the spec green, which is the proof: the code is fine, the
credential is missing.

Two self-inflicted detours worth not repeating: `BAYDAR_SKIP_SAFETY_E2E_ON_EPERM=1`
sets `webServer: []`, so applying it preemptively disabled the servers and every
test got `ERR_CONNECTION_REFUSED` — it is for when EPERM actually bites, not
insurance. And `pnpm --filter … e2e -- --workers=1` forwards `--` to Playwright
as a literal test filter ("No tests found"); use `pnpm exec playwright test`.

## Findings

| Bucket | Found | Closed | Open |
| ------ | ----- | ------ | ---- |
| P0     | 0     | —      | 0    |
| P1     | 5     | 5      | 0    |
| P2     | 7     | 6      | 1    |
| P3     | 3     | 0      | 3    |

Detail in [OPUS5-REVIEW-2026-07-25.md](./OPUS5-REVIEW-2026-07-25.md). Phase 0
ledger in [OPUS5-CLEANUP-2026-07-25.md](./OPUS5-CLEANUP-2026-07-25.md).

Left open deliberately: the Expo Router route warnings (dev-only noise, needs a
routing-convention change wider than this review), the landing page's mixed
Arabic register (editorial — belongs with the native-speaker review), local QA
fixture leakage (never ships), and `expo-env.d.ts` being gitignored-but-tracked
(the obvious fix breaks CI, verified).

## BLOCKED — needs a human

Every item needs an account, a credential, or a person. None is code.
`apps/api/src/config/env.ts:76-146` hard-fails production boot without the first
group, so the API cannot start until they exist.

| Needs                                                                                                            | Who                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `CORS_ORIGINS`, `BAYDAR_WEB_URL`, `INTERNAL_CRON_TOKEN`                                                          | owner — Render/Vercel env                                                                                         |
| `RESEND_API_KEY` + `MAIL_FROM`                                                                                   | owner — Resend account. Transport is already built.                                                               |
| `HYPERPAY_ENTITY_ID` / `_ACCESS_TOKEN` / `_WEBHOOK_SECRET`                                                       | owner — HyperPay merchant onboarding. Until then bank transfer and Karama points are the only real payment paths. |
| `BANK_TRANSFER_IBAN` + `_BENEFICIARY`                                                                            | owner — bank                                                                                                      |
| `CLAMAV_SCAN_URL` + `CLOUDFLARE_IMAGES_SCAN_URL`                                                                 | owner — stand up the scanners, or relax the gate deliberately                                                     |
| `SENTRY_DSN` + `SENTRY_RELEASE`                                                                                  | owner — Sentry project                                                                                            |
| `BAYDAR_APPLE_TEAM_ID`, `BAYDAR_ANDROID_SHA256_CERT_FINGERPRINTS`                                                | owner — Apple / Play consoles. Routes are built and env-driven; they emit nothing useful until set.               |
| EAS project id + signing credentials, production PostHog values                                                  | owner — Expo / PostHog                                                                                            |
| Confirm both Render crons are live with `INTERNAL_CRON_TOKEN`                                                    | owner — Render dashboard                                                                                          |
| The real staging API hostname                                                                                    | owner — it exists only inside `RENDER_STAGING_DEPLOY_HOOK`, which blocks the staging soak and the perf baseline   |
| Real-device smoke: refresh, deep links, push, haptics, offline/SSE resume, swipe archive, cross-device messaging | owner — physical devices. Owed since Sprint 11.5.                                                                 |
| Native-speaker Arabic copy review                                                                                | a human reviewer                                                                                                  |
| Legal / privacy counsel review                                                                                   | counsel — `legal-copy.tsx` is v0.1 placeholder text                                                               |

## Top structural risks

**1. The QA harness is the only thing standing between this product and silent
visual regressions, and it lied four different ways in one session.** Expired
tokens made 15 shots the login page; a fixed delay caught a form mid-spinner; a
blank screen passed a stability check because blank is stable; and overflow was
measured after a screenshot that resizes the viewport. All four are fixed, and
none of them ever failed loudly — a login screen and a spinner are both valid
renders. Assume the next harness bug is also silent. The cheap defence is what
caught these: hash the output and look for duplicate images, and check that
route names and pixel counts move when the route does.

**2. Key-set parity was mistaken for translation coverage for months.** The test
compared `ar` against `en`, so a key missing from both was invisible — which is
exactly how the SSE error path and the 404 page shipped rendering raw key paths
in _both_ languages. Now both apps assert that every statically resolvable
`t("key")` exists. The gap that remains is dynamic keys, `t(variable)`, which no
static check can see; the harness console sweep is the only net there. Any new
"is X consistent?" test should be asked what it _cannot_ see.

**3. Hermes is not the JS engine the shared code was written for.** The
`@baydar/shared` formatters assume a complete `Intl`. Hermes has no
`RelativeTimeFormat`, so every mobile timestamp fell into a hand-rolled branch
that produced ungrammatical Arabic for months — and a test asserted that broken
output, which is how it survived. `@baydar/shared` is the highest-leverage code
in the repo and the only place where a web-correct assumption silently degrades
on mobile. Anything added there needs a Hermes-shaped test.

**4. Documentation rots by accretion, and it has already cost real time.**
Three overlapping status docs existed, two carrying correct SUPERSEDED banners
pointing at a third that was itself 23 days and nine PRs stale, with `CLAUDE.md`
pointing at the deadest one. The pattern was per-session `§N audit log` sections
appended to a document that was never a changelog. Collapsed to one file that
says so in its own second line. Watch for the next `§11`.

**5. The e2e suite is parallel against a single shared database, so it reports
33 failures that are not real.** Anyone who runs `pnpm --filter @baydar/web e2e`
locally sees a broken product; the same suite is 51/51 green with one worker.
A signal that cries wolf gets ignored, and this one already looks exactly like a
mass regression. Fix it before it trains someone to skip the suite.

**6. Single-developer throughput is the real constraint, and the launch
blockers are all serial and external.** Merchant onboarding, Apple/Play consoles,
a mail provider, counsel review, native-speaker copy — none can be parallelised
by writing more code, and several have lead times measured in weeks. The
engineering is far ahead of the provisioning. The highest-value next action is
not a pull request; it is opening the HyperPay and Resend accounts.

## What I did not do

The charter asks for philosophy / hierarchy / detail / functionality / restraint
scored 1–10 across all 85 screens. Not done. Scoring that is a judgement pass
over 520 images, and this run spent its budget on defects that could be
demonstrated instead. No numbers are recorded that were not derived — the
alternative was inventing 425 of them.

Both harnesses are committed and documented, so that pass now costs a session
rather than a week. That was the point of building them.
