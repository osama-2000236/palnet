# HANDOFF — live status

The one status document. Rewritten in place, not appended to — if you want history, use
`git log`, `gh pr list --state all`, and `CHANGELOG.md`. Last verified against `main` on 2026-08-08.

Read order: `CLAUDE.md` → `project-spec.md` → `DESIGN.md` → `BRAND.md` → this file.

## LinkedIn-parity build — in progress

The specification lives in [`docs/linkedin-parity-2026-08/`](linkedin-parity-2026-08/README.md):
eleven phases, each individually shippable, taking Baydar from a working
professional network to a LinkedIn-class platform for this market. Start at that
directory's `PROMPT.md`.

Two rules it adds are permanent, not phasing decisions, and both are now
enforced by a gate rather than by review:

- **Money may never buy rank.** No ranking, ordering, scoring or filtering
  function may read a subscription, plan, invoice, credit or Karama balance.
  `pnpm check:ranking-purity`.
- **Baydar never moves money between members.** Members pay Baydar. No escrow,
  no wallet-to-wallet, no member invoicing, no cart.

| Phase                       | State                    |
| --------------------------- | ------------------------ |
| P0 Ground truth             | **done**                 |
| P1 Low-bandwidth foundation | **done**                 |
| P2 The graph                | **done bar two screens** |
| P3–P11                      | not started              |

**P0 delivered:** all 16 governorates and 93 cities (the table had 13 and 14, so
Salfit, Tubas and North Gaza could not be selected at all and every job
mis-ranked for them); university EDU_EMAIL domains; the employer credit that
would have sold rank removed with its migration; two new gates
(`check:ranking-purity`, `check:deprecations`) in the lint job with tests that
break them; the stale stack tables in `project-spec.md`, `README.md`,
`AGENTS.md` and `CLAUDE.md` corrected against the manifests; `DESIGN.md` §7.3
and `docs/design/PARITY.md` recounted from the barrels; five superseded doc
trees archived. `pnpm check:i18n` was already reporting zero dead keys.

**P1 delivered:** connection-class detection on both platforms feeding one
shared policy table; the `X-Baydar-Connection` hint; the visible خفيف / عادي /
كامل chip in both kits; feed page size driven by the mode; SSE degrading to a
two-minute poll on `light` and opening no EventSource at all; all seven payload
budgets as gates; `IdempotencyRecord` with a replay that returns the original
response and status; the shared outbox with two storage adapters, its «لم
تُرسل» tray, and the composer routing a lost post into it; server-side image
variants behind `CLOUDFLARE_IMAGES_TRANSFORM_URL` with tap-to-load on `light`;
resumable uploads over R2 multipart; the offline read cache with «آخر تحديث»
and web's first offline banner; and the 2G journey spec.

**P2 delivered:** the asymmetric edge and its counters; mute and restrict, the
two primitives short of a block; degree and mutuals, first-degree live and
second from a nightly table; a suggestion engine that returns a reason with
every candidate and returns nobody it cannot explain; alumni, diaspora and
nearby endpoints; `FollowButton`, `DegreeChip`, `MutualsRow` and
`SuggestionCard` in both kits; and five network tabs on both platforms.

**What P2 owes:** the `network/alumni` and `network/diaspora` screens. Their
endpoints work and are pinned; what is missing is a route to reach them from,
and the diaspora filter should wait for P3's `originGovernorate` rather than be
written against a derived city and then rewritten. In `BLOCKERS.md`.

**The one thing P1 owes:** `apps/web/e2e/two-g.spec.ts` is written and not yet
run — Playwright needs the seeded QA stack and this worktree shares that
database. `BLOCKERS.md` has the command and what to do if the budgets fail.

Deviations from the spec are in that directory's `GAPS-FOUND.md` — eight so
far. **GAP-03 and GAP-08 are the two to read**: the first is why neither
payload optimisation was built, the second is a follow-graph uniqueness
constraint that compiles and does not work: the feed page measures ~2 KB gzipped
against a 24 KB budget, so neither payload optimisation §15.2 asked for was
worth building. Failed gates would be in `BLOCKERS.md`, which is empty.

### Still open: the Pass 2 design ask

`docs/_archive/design-handoff-2026-05/10-ask.md` asks for a lead decision on
monetization-surface review, admin operator UX, and a motion vocabulary doc. It
was archived on 2026-08-08 along with the rest of that tree, and **archiving a
question does not answer it** — engineering still does not implement Pass 2
output before lead approval. Tracked here because `docs/_archive/` is where
people look for closed things.

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

**With two exceptions** — see "Open product gaps" below. Two whole features are built and tested
server-side with no UI on either platform. Neither is visible from the spec, the gates, or the route
trees, which is why they survived this long. The two live defects on that list (sign-out not
revoking, two rewards charging for nothing) are closed as of 2026-07-30.

The round-2 review (`review/opus5-round-2`, 2026-07-25) closed three P1s that no gate could have
caught: Karama points could be minted by toggling an application's hire status, the points
checkout could be charged twice, and web SSE never reconnected after any dropped connection.
Findings and corrections: [`docs/audit/OPUS5-ROUND2-2026-07-25.md`](audit/OPUS5-ROUND2-2026-07-25.md).
Screen scores: [`docs/audit/OPUS5-RUBRIC-2026-07-25.md`](audit/OPUS5-RUBRIC-2026-07-25.md).
Arabic copy review list: [`docs/audit/ARABIC-REGISTER-2026-07-25.md`](audit/ARABIC-REGISTER-2026-07-25.md).

## Open product gaps

Found by scanning all 143 routes in `apps/api/src/modules/api-route-coverage.spec.ts` against every
client source tree, not by reading the spec. **Three closed on 2026-07-30 — the two defects and the
unreachable endpoint. Six remain open**, none started, none with a branch.

Ordered by damage, not by effort.

| #   | Gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Status                 | Evidence                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Two Karama rewards debited points and granted nothing.** Withdrawn, not implemented: `BOOST_APPLICATION` and `FEATURED_PROFILE_7D` are gone from `KaramaReward`, from both clients and from all four i18n catalogs. `KaramaReason` keeps both `REDEEM_*` members so old ledger rows still read. Premium is the only reward, and it works because billing orchestrates it. To bring either back you need three things this repo does not have: a column that records the grant, a `RedeemKaramaBody` that names a target, and a ranking pass that reads it — `jobs.service.ts` orders by `createdAt`, `search.service.ts` by `updatedAt`. | **closed 2026-07-30**  | `packages/shared/src/schemas/karama.ts`; `karama.service.ts` `REDEEM_COSTS`; points price now `KARAMA_REWARD_COSTS` in shared, was three copies |
| 2   | **Sign-out never revoked the session.** Fixed: one `signOut()` per platform revokes this device before dropping the local session, called from the two user-initiated sign-out sites. The remaining `clearSession()` calls are the already-dead-session paths, where a revoke is a guaranteed 401. Best-effort — a failed revoke still signs out locally.                                                                                                                                                                                                                                                                                  | **closed 2026-07-30**  | `apps/web/src/lib/api.ts` + `apps/mobile/src/lib/api.ts` `signOut()`; covered both directions in `api-refresh.test.ts` and mobile `api.test.ts` |
| 3   | **Two-sided ratings: complete backend, zero UI.** `UserRating` model, `CANDIDATE_RATES_EMPLOYER`/`EMPLOYER_RATES_CANDIDATE`, 1–5 + comment, scoped to a job, plus a purpose-built `/summary` endpoint. 0 client files mention it.                                                                                                                                                                                                                                                                                                                                                                                                          | **open — not started** | `schema.prisma:875-891`; `packages/shared/src/schemas/rating.ts:3-7`; `ratings.controller.ts`                                                   |
| 4   | **Company team management: complete backend with RBAC, zero UI.** OWNER/ADMIN/EDITOR guards on four endpoints. Consequence: every employer is a one-person account — a recruiter and a hiring manager cannot share a job.                                                                                                                                                                                                                                                                                                                                                                                                                  | **open — not started** | `company-members.controller.ts:40-70`; `schema.prisma:642-653`                                                                                  |
| 5   | **Mobile makes users accept terms they cannot read.** `acceptTerms` is enforced; the screen contains zero links to the documents. Web has two (#114). All four `/legal/*` pages are web-only. Plausible app-store rejection, not a UX nit.                                                                                                                                                                                                                                                                                                                                                                                                 | **open — compliance**  | `apps/mobile/app/(auth)/register.tsx:42`; 0 matches for `legal\|tos\|privacy` in that file                                                      |
| 6   | **No mobile CV export.** Web renders a print-optimised résumé with correct RTL shaping and uses the print dialog as the PDF exporter. No mobile twin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **open — not started** | `apps/web/src/app/[locale]/cv/page.tsx`                                                                                                         |
| 7   | **No mobile view for a shared job link.** `/j/[id]` is the public unauthenticated job page on web; mobile has no route, so a job shared into WhatsApp has nowhere to land on a phone.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **open — not started** | `GET /jobs/public/:id`; 0 mobile files reference `jobs/public`                                                                                  |
| 8   | **`GET /connections/counts` was unreachable.** Wired into the `/network` tab strip on both platforms, which needed the native `Tab` to grow web's `count` + `formatCount` — that closes the last real row in `PARITY.md`'s component gap table. Web's `/network` was also the one page still shadowing the kit with a local `FilterTab`; it uses `Tabs` now. Counts refresh after accept/decline/withdraw/remove, because each moves a row between two tabs.                                                                                                                                                                               | **closed 2026-07-30**  | `ConnectionCounts` in `packages/shared/src/schemas/connection.ts`; both `/network` screens                                                      |
| 9   | **Copy still diverges.** 30 keys flagged `unreconciled` — the same screen phrased differently on each platform. Separately the gate now reports platform-only surface at its ceiling: **web 163 keys, mobile 100** (worst namespace: `employer`, 30 web-only vs 15 mobile-only).                                                                                                                                                                                                                                                                                                                                                           | **open — ledgered**    | `scripts/check-i18n-parity.mjs:35-79`; `pnpm check:i18n`                                                                                        |

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
- **`payBasis` has copy but no display, and no writer.** `jobs.payBasisLabels` / `payMinLabels` /
  `payMaxLabels` are in all four catalogs and read by nothing, deliberately: §B11 wants every
  label to be an i18n key from commit one so the Arabic register reviewer can work ahead of the
  UI. But `formatSalaryRange()` takes no basis, so a `DAY_LABOR` job's "150 ILS" would read as a
  monthly salary. Unreachable today — no form sends `payBasis`, so every row is `MONTHLY` and a
  suffix would never render. **Phase 2 owns both halves:** whatever adds the basis control to the
  employer job form must also append the basis at the four `formatSalaryRange` call sites
  (`jobs/page.tsx`, `jobs/[id]`, `company/[slug]`, public `j/[id]`) — and note mobile renders no
  salary at all yet, so lockstep there is a new surface, not an edit.
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

## Ponytail audit 7 — two earlier "cleared" calls were wrong (PR #142)

Recorded so neither gets re-litigated or re-added:

- **Rate limiting is one system now, not two.** An earlier audit cleared the hand-built limiter that
  ran beside `@nestjs/throttler` on the grounds that only it could produce the app's
  `DomainException`/`RATE_LIMITED` envelope. Throttler can: `getTracker`, `generateKey` and
  `throwThrottlingException` are protected overrides. `BaydarThrottlerGuard` is those three;
  the custom guard, store, module and second Redis Lua script are gone. `@RateLimit("bucket")`
  still means one shared budget across every handler carrying that bucket — that is what
  `generateKey` is for, and `media.controller.spec.ts` is the test that fails without it.
- **`tokens.css` is generated for real now.** It carried a "DO NOT EDIT BY HAND — regenerate with
  `pnpm tokens:build`" header over 323 lines of hand-synced hex while `tokens:build` was `tsc`.
  `scripts/build-tokens.mjs` **at the repo root** emits it — this line said
  `packages/ui-tokens/scripts/build-tokens.mjs`, which has never existed;
  `pnpm check:tokens` fails CI on drift.
  Add tokens in `index.ts`, run `pnpm tokens:build`, commit the regenerated CSS.
  `tokens.native.ts` is still hand-authored — RN shadows, the tighter mobile type scale and
  PostScript font names are not derivable — but it references `tokens` for every value it used to
  restate.

Not removable despite having zero imports: `react-native-reanimated`, `react-native-worklets`,
`expo-linking`, `@react-navigation/native`. All are declared peers of `expo-router` or
`@react-navigation/bottom-tabs`.

## Semantic colours: A6 measured them against white only

Audit A6 tuned each light semantic to ~4.5:1 **against its own translucent tint over
`#ffffff`**. The tint is translucent, so the real ratio depends on what is underneath, and
every warm surface in the system is darker than white. Measured:

| token   | white | muted | subtle | sunken |
| ------- | ----- | ----- | ------ | ------ |
| warning | 4.51  | 4.28  | 4.09   | 3.87   |
| success | 4.57  | 4.34  | 4.14   | 3.92   |
| info    | 4.97  | 4.74  | 4.53   | 4.25   |
| danger  | 5.87  | 5.56  | 5.31   | 4.98   |

`danger` is the only one that holds everywhere. **`warning` is fixed** — `#926516` → `#7e5713`,
same hue at 86% lightness, worst surface now 4.61 — because the never-pay banner put it on a
muted page background and `e2e/a11y.spec.ts` failed job detail on it in CI. That test is the
only reason any of this was found: nothing else in the product had yet placed a warning tint on
a non-white surface inside a scanned route.

**`success` and `info` are still wrong** and were left alone deliberately — no current surface
puts them on `muted`/`sunken` inside a scanned route, so fixing them is a design change with no
failing test behind it, and it would move visual snapshots on pages this branch never touched.
The fix is mechanical when someone wants it: same hue, scale to ~86%, re-run `pnpm tokens:build`.

## Hard borders

`CLAUDE.md` is law: tokens only, RTL-safe logical CSS, Arabic-first, web↔mobile lockstep,
framework-neutral `ui-*`, no viewer-scoped public caching, no placeholder production routes, SSE
stays the realtime transport, design work routes to `design-handoff-2026-06/`.
