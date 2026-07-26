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

## Phase 5 evidence

**Lighthouse, desktop** — 4 URLs × 3 runs, every assertion cleared with margin.

|                | `/ar-PS` | `/en` | `/ar-PS/login` | `/ar-PS/register` | threshold         |
| -------------- | -------- | ----- | -------------- | ----------------- | ----------------- |
| performance    | 99       | 99    | 99             | 99                | ≥85 warn          |
| accessibility  | 100      | 100   | 100            | 100               | ≥95 **error**     |
| best-practices | 96       | 96    | 100            | 100               | ≥90 warn          |
| SEO            | 100      | 100   | 100            | 100               | —                 |
| LCP            | 1.0s     | 1.0s  | 1.0s           | 1.0s              | ≤2500ms **error** |
| TBT            | 0ms      | 0ms   | 0ms            | 20ms              | ≤200ms **error**  |
| CLS            | 0        | 0.002 | 0              | 0                 | ≤0.1 **error**    |

`lighthouserc.mobile.json` defined a phone budget and **was invoked by nothing** —
on an Arabic-first product where most traffic is a phone. Now wired into CI.

**Maestro** — all seven flows, run for the first time. Initially 3/7.

| flow          | result                         |
| ------------- | ------------------------------ |
| login-to-feed | pass (was a cold-bundle flake) |
| compose-post  | pass                           |
| send-message  | pass                           |
| register      | pass (was unrunnable)          |
| search        | pass (was unrunnable)          |
| apply-to-job  | pass                           |
| profile-edit  | pass (was a stale assertion)   |

None of the four failures was a product defect. `register` and `search` typed
Arabic, which Maestro cannot do at all (`Unicode character input is not
supported`, mobile-dev-inc/maestro#146) — they could never have passed on any
machine. `profile-edit` asserted `"حفظ"` against a button reading
`"حفظ التغييرات"`; probing showed Maestro matches Arabic exactly but not as a
substring. All now 7/7.

**Security sweep**

- `assert-security-headers.mjs` passes — and was referenced by no package script
  and no workflow, so it had never run in CI. Now `pnpm check:security-headers`,
  wired into the lint job.
- Production CORS is fail-closed on both layers: `env.ts:76-90` refuses to boot
  without `CORS_ORIGINS`, and `buildCorsOrigin("")` returns `false`, which
  disables CORS outright. Wildcards rejected unless project-scoped Vercel
  previews.
- Auth rate limits, refresh-token reuse/rotation, and media presign MIME/size
  are covered by existing API specs (320 passing).
- No viewer-scoped payload behind a public cache — verified at the type level.

**Data safety** — all 20 migrations apply cleanly forward into an empty schema,
producing 38 tables with 20 recorded finished. Verified against a scratch schema
on the QA database, then dropped.

## Findings

| Bucket | Found | Closed | Open |
| ------ | ----- | ------ | ---- |
| P0     | 0     | —      | 0    |
| P1     | 5     | 5      | 0    |
| P2     | 8     | 8      | 0    |
| P3     | 3     | 1      | 2    |

Detail in [OPUS5-REVIEW-2026-07-25.md](./OPUS5-REVIEW-2026-07-25.md). Phase 0
ledger in [OPUS5-CLEANUP-2026-07-25.md](./OPUS5-CLEANUP-2026-07-25.md).

Phase 5 added a category the earlier passes missed: **three guards that existed
and ran nowhere** — the security-headers assertion, the mobile Lighthouse
budget, and two Maestro flows that could not execute at all. A check nobody
runs is worse than no check, because it reads as coverage. All three are wired
now.

Two P3s stay open, both by choice: the landing page's mixed Arabic register
(editorial — belongs with the native-speaker review already in `BLOCKED`) and
local QA fixture leakage (dev-only data that never ships; `qa:cleanup` exists).

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

> **Superseded in part by round 2 (2026-07-25).** See
> [OPUS5-ROUND2-2026-07-25.md](./OPUS5-ROUND2-2026-07-25.md) and
> [OPUS5-RUBRIC-2026-07-25.md](./OPUS5-RUBRIC-2026-07-25.md). Round 2 closed
> the long-service-file read, the deliberate state captures, SSE reconnection,
> and every shortcut this document left open, and scored 46 of the 85 screens.
> Updated status at the end of this section.

Two charter items are genuinely outstanding. Neither is a defect; both are
work, and pretending otherwise would make this document useless.

**The 85-screen rubric.** Philosophy / hierarchy / detail / functionality /
restraint, scored 1–10 across 47 web routes and 38 mobile screens. Not done. It
is a judgement pass over 520 images and this run spent its budget on defects
that could be demonstrated. No numbers are recorded that were not derived — the
alternative was inventing 425 of them. Both harnesses are committed and
documented, so the pass now costs a session rather than a week.

**Full post-fix visual review.** Both matrices were captured and machine-checked
after the fixes — 0 duplicate-hash groups above 2, 0 blank frames, 0 horizontal
overflow across 46 routes × 2 locales. But I looked at roughly 20 of the 520
images with my own eyes. The automated checks catch blank, duplicated, clipped
and overflowing; they do not catch "this screen is ugly" or "this hierarchy is
wrong", which is exactly what the rubric is for. Treat the visual state as
machine-verified, not design-reviewed.

### Status after round 2

**The web matrix at `ar-PS` / light / desktop is design-reviewed, not merely
machine-verified.** All 46 routes in that cell are scored on all five
dimensions in [OPUS5-RUBRIC-2026-07-25.md](./OPUS5-RUBRIC-2026-07-25.md), with
the screenshot filename as evidence, and every one was looked at — on contact
sheets, with the ambiguous ones opened at full resolution. Four sub-7 cells
across three screens: one fixed, three recorded with a written reason for
leaving them to the design owner rather than an audit branch.

**The other three web cells (dark, `en`, mobile viewport) stay
machine-verified.** Captured and swept; nobody has scored them. Layout
judgements carry across a theme or locale swap, detail judgements do not, so
round 2 declined to copy numbers sideways to make a table look complete.

**The 38 mobile screens were not re-captured and stay machine-verified from
round 1.** Round 2 moved 52 mobile files out of the Expo Router tree, and
bundling that against a Metro instance from a different worktree would have
produced a matrix of the _previous_ code — a silent wrong answer, which is the
one failure mode this harness keeps producing. `apps/mobile/e2e/shots.mjs` now
captures `adb logcat` per screen, so the next mobile run finally gets the
console evidence the web runs have always had.

Round 2 found three defects by looking at screens rather than at code, which is
the whole argument for the rubric existing: a landing page inviting signed-in
members to create an account, a security page printing raw user-agent strings
on the one surface where a member has to recognise their own devices, and a
fifth way the harness was quietly lying.

The top structural risk list below still stands, with one item to add: **the
screenshot harness must not be run against a live dev server while anyone is
editing application code.** Round 2 lost an hour-long matrix to exactly that —
a hot reload mid-run turned every subsequent authenticated shot into an error
boundary, and the contact sheet read as a mobile-only crash until the console
capture named the real cause.
