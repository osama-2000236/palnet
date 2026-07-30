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

**With two exceptions, and two live defects** — see "Open product gaps" below. Two whole features
are built and tested server-side with no UI on either platform, and two Karama rewards debit a real
balance and grant nothing. None of that is visible from the spec, the gates, or the route trees,
which is why it survived this long.

The round-2 review (`review/opus5-round-2`, 2026-07-25) closed three P1s that no gate could have
caught: Karama points could be minted by toggling an application's hire status, the points
checkout could be charged twice, and web SSE never reconnected after any dropped connection.
Findings and corrections: [`docs/audit/OPUS5-ROUND2-2026-07-25.md`](audit/OPUS5-ROUND2-2026-07-25.md).
Screen scores: [`docs/audit/OPUS5-RUBRIC-2026-07-25.md`](audit/OPUS5-RUBRIC-2026-07-25.md).
Arabic copy review list: [`docs/audit/ARABIC-REGISTER-2026-07-25.md`](audit/ARABIC-REGISTER-2026-07-25.md).

## Open product gaps

Found by scanning all 143 routes in `apps/api/src/modules/api-route-coverage.spec.ts` against every
client source tree, not by reading the spec. **Re-verified against `main` @ `c8248a7` on 2026-07-30:
all nine are still open** — PRs #127–#138 closed the design-system drift, not these. Nothing here is
started; none has a branch.

Ordered by damage, not by effort. The first two are defects, not missing features — they should be
closed before anything is added.

| #   | Gap                                                                                                                                                                                                                                                                                                                                                                                                        | Status                 | Evidence                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Two Karama rewards debit points and grant nothing.** `KaramaService.redeem()` has no switch on `body.reward` — it writes a negative ledger row and echoes the reward back. `PREMIUM_30D` works only because billing orchestrates it. `BOOST_APPLICATION` (100 pts) and `FEATURED_PROFILE_7D` (1000 pts) are offered in both clients and grant nothing: no state column exists, and no ranking reads one. | **open — defect**      | `karama.service.ts:152-208`; `billing.service.ts:239`; `me/karama/page.tsx:30,32`; no `boostedUntil`/`featuredUntil` in `schema.prisma`; `jobs.service.ts:135` orders by `createdAt`, `search.service.ts:166` by `updatedAt` |
| 2   | **Sign-out never revokes the session.** `POST /auth/logout` exists and sets `revokedAt` correctly; neither client calls it. The refresh token stays valid until expiry, and because `listSessions()` filters `revokedAt: null`, Settings → Security keeps listing the signed-out device as active — the screen states something false.                                                                     | **open — defect**      | `auth.service.ts:126-131,140`; clients only `clearSession()` at `apps/web/src/lib/api.ts:51,59` and `apps/mobile/src/lib/api.ts:73,87`                                                                                       |
| 3   | **Two-sided ratings: complete backend, zero UI.** `UserRating` model, `CANDIDATE_RATES_EMPLOYER`/`EMPLOYER_RATES_CANDIDATE`, 1–5 + comment, scoped to a job, plus a purpose-built `/summary` endpoint. 0 client files mention it.                                                                                                                                                                          | **open — not started** | `schema.prisma:875-891`; `packages/shared/src/schemas/rating.ts:3-7`; `ratings.controller.ts`                                                                                                                                |
| 4   | **Company team management: complete backend with RBAC, zero UI.** OWNER/ADMIN/EDITOR guards on four endpoints. Consequence: every employer is a one-person account — a recruiter and a hiring manager cannot share a job.                                                                                                                                                                                  | **open — not started** | `company-members.controller.ts:40-70`; `schema.prisma:642-653`                                                                                                                                                               |
| 5   | **Mobile makes users accept terms they cannot read.** `acceptTerms` is enforced; the screen contains zero links to the documents. Web has two (#114). All four `/legal/*` pages are web-only. Plausible app-store rejection, not a UX nit.                                                                                                                                                                 | **open — compliance**  | `apps/mobile/app/(auth)/register.tsx:42`; 0 matches for `legal\|tos\|privacy` in that file                                                                                                                                   |
| 6   | **No mobile CV export.** Web renders a print-optimised résumé with correct RTL shaping and uses the print dialog as the PDF exporter. No mobile twin.                                                                                                                                                                                                                                                      | **open — not started** | `apps/web/src/app/[locale]/cv/page.tsx`                                                                                                                                                                                      |
| 7   | **No mobile view for a shared job link.** `/j/[id]` is the public unauthenticated job page on web; mobile has no route, so a job shared into WhatsApp has nowhere to land on a phone.                                                                                                                                                                                                                      | **open — not started** | `GET /jobs/public/:id`; 0 mobile files reference `jobs/public`                                                                                                                                                               |
| 8   | **`GET /connections/counts` unreachable.** The endpoint that would let both platforms show counts without over-fetching lists.                                                                                                                                                                                                                                                                             | **open — minor**       | 0 client references                                                                                                                                                                                                          |
| 9   | **Copy still diverges.** 30 keys flagged `unreconciled` — the same screen phrased differently on each platform. Separately the gate now reports platform-only surface at its ceiling: **web 163 keys, mobile 100** (worst namespace: `employer`, 30 web-only vs 15 mobile-only).                                                                                                                           | **open — ledgered**    | `scripts/check-i18n-parity.mjs:35-79`; `pnpm check:i18n`                                                                                                                                                                     |

**Before starting #3**, decide the anti-gaming rules — two-sided ratings fail through retaliation,
reciprocity bias and inflation to all-fives. The usual mitigations are simultaneous blind reveal, a
minimum count before any average is shown, and a window tied to the application lifecycle. The
existing unique constraint `(raterId, rateeId, context, jobId)` supports all three; none is built.
This is the only item on the list that needs a product decision before code.

**Not gaps:** six Prisma models are never named in a client — `RefreshToken`,
`EmailVerificationToken`, `PasswordResetToken`, `SseStreamToken`, `ProfileSkill`, `ChatRoomMember`.
All six are token or join tables and correctly server-side. Push registration, job alerts and skill
endorsements were checked and _are_ wired.

## Occupation platform — phase 1 landed, contracts only

The audience widening described in [`docs/design/OCCUPATIONS.md`](design/OCCUPATIONS.md),
[`FEED-RANKING.md`](design/FEED-RANKING.md) and [`MATCHING.md`](design/MATCHING.md). Phase 1 of
`docs/NEXT-SESSION-PROMPT.md` §B12: taxonomy, enums, Zod, schema and migration. **No new UI**, so
nothing about this is visible to a user yet.

Shipped: the taxonomy in `packages/shared` with a `check:naming` gate over its vocabulary —
`PS_OCCUPATION_FAMILIES` / `PS_OCCUPATIONS` / `PS_PROFESSIONAL_BODIES` are the tables in
`occupations-data.ts`, re-exported from `occupations.ts`, which holds the lookups
(`normalizeOccupation`, `trackOf`, `standingLabelKey`); `governorateOfCity` /
`regionOfGovernorate` / `proximityScore` went into `palestine.ts` beside the city list they
derive from. Three files rather than one because `qa:design` caps a source file at 300 LOC;
`JobType` +5 values and 2 relabels; `PayBasis`; `CompanyKind`; `Post.isWorkSample`;
`Profile.acceptingWork` / `servesAtClientSite` / `hasWorkshop`; and **`Job.companyId` is now
nullable**, which is the change with the widest blast radius.

`jobSource()` in `packages/shared/src/schemas/job.ts` is the single place that decides whether a
job reads as a business or a person. Every renderer on both platforms goes through it — do not
re-invent that fallback locally, which is the whole reason it is shared.

Owed, and easy to lose:

- **`search.service.ts` still INNER JOINs `Company`.** A null-`companyId` job is silently missing
  from job search rather than wrong in it. Harmless only because nothing can create one yet — the
  composer that posts work without a company is phase 5. Phase 4 owns it; the `ponytail:` comment
  at the JOIN names why it is not a one-word fix. **Do not ship phase 5 before this.**
- **Nine models have no engine.** `OccupationClaim`, `WorkProof`, `Standing`, `Vouch`, `Licence`,
  `PostTopic`, `InterestWeight`, `FeedSlate`, `TopicMute` are created by the migration and read or
  written by nothing. They are the phase 3–4 data model, front-loaded into one migration. Either
  those phases land or the tables get dropped; empty tables that outlive their plan are how a
  schema rots.
- **Account deletion is a soft delete** (`deletedAt` + anonymize, with a restore grace window), so
  none of the migration's 15 new foreign keys ever fires its delete rule — 11 `ON DELETE CASCADE`
  plus 4 `ON DELETE SET NULL` on `WorkProof`'s optional counterparty, job and application refs
  (all four columns are nullable, so the rule is valid). Nothing leaks today because the tables are
  empty. Whoever builds the rank engine owns the answer for what a deleted account's `Standing`,
  `WorkProof` and outbound `Vouch` rows mean.
- **Craft family keys are still unconfirmed** — `OCCUPATIONS.md` §6 item 5. Keys are forever,
  Arabic labels are an i18n edit. Needs a tradesperson, not a search engine.

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
