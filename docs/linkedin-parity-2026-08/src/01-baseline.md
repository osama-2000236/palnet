---

# 1. Verified baseline — what the repo is, from a real scan

Everything in this section was read out of the repository on 8 August 2026, not recalled from documentation. Where a doc in the repo disagrees with the code, the code is recorded and the disagreement is noted.

## 1.1 Shape

| Measure                            | Value                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracked files                      | 976                                                                                                                                                   |
| TypeScript (`.ts`)                 | 375                                                                                                                                                   |
| React (`.tsx`)                     | 340                                                                                                                                                   |
| Markdown docs                      | 73                                                                                                                                                    |
| SQL migrations                     | 23                                                                                                                                                    |
| Prisma schema                      | 1,240 lines, 44 models, 29 enums                                                                                                                      |
| Pinned API routes                  | 137 (`apps/api/src/modules/api-route-coverage.spec.ts`)                                                                                               |
| Routes reachable without a session | 17, each individually justified in that spec                                                                                                          |
| Web routes                         | 44 route directories under `apps/web/src/app/[locale]`                                                                                                |
| Mobile routes                      | 41 files under `apps/mobile/app`                                                                                                                      |
| `ui-web` source files              | 53                                                                                                                                                    |
| `ui-native` source files           | 46                                                                                                                                                    |
| i18n keys                          | web 979 × 2 languages, mobile 867 × 2 languages                                                                                                       |
| i18n namespaces                    | web 32, mobile 29                                                                                                                                     |
| Design tokens                      | 299 lines in `packages/ui-tokens/src/index.ts`, generated to CSS + native                                                                             |
| Bespoke CI gates                   | 7 (`lint:tokens`, `check:i18n`, `check:ui-lockstep`, `check:naming`, `check:native-versions`, `check:release-placeholders`, `check:security-headers`) |

## 1.2 Stack, as actually locked

`project-spec.md` and `docs/HANDOFF.md` disagree on version numbers; `HANDOFF.md` is newer and matches the lockfile. The real, current stack:

| Layer           | Version in `main`                                                    |
| --------------- | -------------------------------------------------------------------- |
| Node            | 24                                                                   |
| Package manager | pnpm 9.12.0                                                          |
| Monorepo        | Turborepo 2.x                                                        |
| Web             | Next.js 16 (Turbopack), React 19, Tailwind 4, `next-intl` 4          |
| Mobile          | Expo SDK 54, React Native 0.81, React 19, Expo Router, RN StyleSheet |
| API             | NestJS 11, REST + Swagger at `/api/docs`, SSE for realtime           |
| Database        | PostgreSQL 16, Prisma 6                                              |
| Contracts       | Zod 4 in `@baydar/shared`                                            |
| Lint            | ESLint 9 flat config                                                 |
| Auth            | Self-managed JWT access/refresh, bcrypt cost 12                      |
| Media           | Cloudflare R2 signed uploads, blurhash                               |
| Mail            | Resend                                                               |
| Cache / limits  | Redis (`@nestjs/throttler` via `BaydarThrottlerGuard`)               |

**Blocked upstream, verified against the packages** — do not attempt these:

| Upgrade      | Blocker                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Jest 30      | `jest-expo@57` still depends on the Jest 29 toolchain                                                                    |
| ESLint 10    | `eslint-plugin-import` caps at 9                                                                                         |
| Prisma 7     | Rejects `datasource.url` in schema; needs `prisma.config.ts` + a driver adapter, which is its own PR with a staging soak |
| Expo 54 → 57 | Needs physical-device smoke evidence, which nobody has gathered                                                          |

## 1.3 The data model, by domain

44 models. Grouped as the schema groups them:

**Identity & auth (5):** `User`, `RefreshToken`, `EmailVerificationToken`, `PasswordResetToken`, `SseStreamToken`.

**Profile (5):** `Profile`, `Experience`, `Education`, `Skill`, `ProfileSkill`.

**Social graph (2):** `Connection`, `BlockedUser`.

**Content (6):** `Post`, `Media`, `Reaction`, `Comment`, `Repost`, `Bookmark`.

**Messaging (3):** `ChatRoom`, `ChatRoomMember`, `Message`.

**Notifications (2):** `Notification`, `DeviceToken`.

**Jobs (5):** `Company`, `CompanyMember`, `Job`, `JobAlert`, `Application`.

**Moderation (2):** `Report`, `ModerationAction`.

**Monetization (7):** `Plan`, `Subscription`, `Invoice`, `Payment`, `EmployerCredit`, `KaramaLedger`, `UserRating`.

**Occupations & evidence (5):** `OccupationClaim`, `WorkProof`, `Standing`, `Vouch`, `Licence`.

**Feed ranking (4):** `PostTopic`, `InterestWeight`, `FeedSlate`, `TopicMute`.

### 1.3.1 The nine engineless models — measured

`docs/HANDOFF.md` states that nine models "are created by the migration and read or written by nothing." A reference count across every `.ts` and `.tsx` file outside `node_modules` refines that:

| Model             | Files referencing the identifier | Reality                                       |
| ----------------- | -------------------------------- | --------------------------------------------- |
| `OccupationClaim` | 0                                | Truly dead. No writer, no reader.             |
| `Vouch`           | 0                                | Truly dead.                                   |
| `FeedSlate`       | 0                                | Truly dead.                                   |
| `TopicMute`       | 0                                | Truly dead.                                   |
| `PostTopic`       | 1                                | Schema only. No engine.                       |
| `InterestWeight`  | 1                                | Schema only. No engine.                       |
| `WorkProof`       | 2                                | Type-level references only. No engine.        |
| `Licence`         | 5                                | Type + copy references. No verification flow. |
| `Standing`        | 8                                | Most-referenced of the nine; still no writer. |

**Consequence for this plan:** the occupation/standing/matching/ranking layer is a fully-argued design with a committed schema and zero behaviour. It is not scaffolding to work around — it is the single largest ready-to-build asset in the repo, and §8 (feed engine), §10 (hiring), and §5 (identity) each consume part of it. Building these engines is the highest-leverage work available, because the hard design arguments are already settled and written down.

### 1.3.2 What is already Palestine-specific — and correct

The repo has done real market work already. Do not re-do it, and do not regress it:

- **`packages/shared/src/palestine.ts`** — governorates, cities, universities, industries, `normalizeCity`, `governorateOfCity`, `regionOfGovernorate`, `proximityScore`. The proximity function exists because a job in Nablus is not reachable from Gaza, and the graph has to know that.
- **`packages/shared/src/minimum-wage.ts`** — Council of Ministers Resolution No. 4 of 2021: 1,880 ILS monthly, 85 ILS daily, 10.5 ILS hourly. Implemented as a pure function over job fields with no stored column, precisely so an amendment to the resolution cannot leave stale flags on old rows. This is the correct pattern and §13 extends it rather than replacing it.
- **`packages/shared/src/arabic-fold.ts`** — Arabic normalisation for search and matching.
- **`ReportReason.FEE_REQUEST` / `GHOST_JOB` / `ID_REQUEST`** — the three report reasons that a generic social network does not have, added because "asked me for money" is the dominant local job scam and a worker needs a name for it.
- **`RejectionReason`** — required on every `REJECTED` transition, with the schema comment: _"silence is the dominant complaint in a market with far more applicants than openings, and it is the cheapest one to fix."_ This is a genuinely better design than LinkedIn's, which lets applications rot silently. Keep it and extend it.
- **`JobType`** — includes `SEASONAL`, `DAY_LABOR`, `PIECE_WORK`, `APPRENTICESHIP`, which no international jobs board models properly.
- **`PayBasis`** — `MONTHLY | DAILY | HOURLY | PER_JOB | PER_PIECE | COMMISSION`.
- **`CompanyKind`** — `EMPLOYER | FIRM | SHOP | WORKSHOP | FOOD | FARM | SOLO`.
- **`Job.companyId` is nullable** — so an individual can post "need someone to rewire two rooms in Ramallah". Widest-blast-radius change in the schema; `jobSource()` in `packages/shared/src/schemas/job.ts` is the single place that decides whether a job reads as a business or a person.
- **`PaymentMethod`** already enumerates `JAWWALPAY | PALPAY | REFLECT` alongside `CARD | BANK_TRANSFER | POINTS`.

### 1.3.3 Gaps found in the Palestine data itself

Two concrete, verifiable defects in `palestine.ts`:

1. **Only 13 of the 16 official governorates are present.** Missing: **Salfit (سلفيت)**, **Tubas (طوباس)**, and **North Gaza (شمال غزة)**. A member in Salfit currently cannot select their governorate, which means `governorateOfCity` returns `null` for them and `proximityScore` degrades to its fallback. This silently mis-ranks every job for those three governorates.
2. **The city list is one city per governorate almost everywhere** — 14 cities for a population of 5.56 million. Bethlehem is the only governorate with two. There is no Beit Sahour, no Al-Bireh as a distinct entry, no Jabalia, no Beit Hanoun, no Yatta, no Dura, no Halhul, no Beita, no Anabta, no Qabatiya, no Tammun, no Bani Na'im, no Idhna, no Beit Lahia. Job location, profile location, and proximity ranking are all coarser than the market they serve.

§13 fixes both, with the full replacement table given as data in `spec/palestine-governorates.delta.ts`.

## 1.4 The API surface

137 pinned routes across 24 modules: `account`, `admin`, `auth`, `billing`, `bookmarks`, `comments`, `companies`, `connections`, `feed`, `health`, `jobs`, `karama`, `mail`, `media`, `messaging`, `notifications`, `posts`, `prisma`, `rate-limit`, `ratings`, `reactions`, `redis`, `reposts`, `safety`, `search`.

The route-coverage spec is a genuinely good piece of engineering: it enumerates controllers off disk by reflection rather than from a hand-kept list, and it pins the unauthenticated surface separately. **Every route this document adds must be added to both arrays in that spec in the same commit**, or the gate fails — which is the intended behaviour, not an obstacle.

### 1.4.1 Known API defects this plan must fix

| Defect                                                                                                                                                                                                      | Evidence                                                                               | Fixed in |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| `search.service.ts` INNER JOINs `Company`, so a null-`companyId` job is invisible to job search                                                                                                             | `HANDOFF.md` "Owed, and easy to lose"; the `ponytail:` comment at the JOIN             | §17      |
| `jobs.service.ts` orders by `createdAt`; `search.service.ts` by `updatedAt`. No relevance ranking anywhere                                                                                                  | `HANDOFF.md` gap #1                                                                    | §17      |
| `payBasis` has i18n copy in all four catalogs, a column, and no writer and no display. `formatSalaryRange()` takes no basis, so a `DAY_LABOR` job's "150 ILS" would read as monthly                         | `HANDOFF.md`; four call sites named                                                    | §10      |
| `feed.service.ts` is a pure reverse-chronological connection query. `FeedSlate`, `InterestWeight`, `PostTopic`, `TopicMute` are unused                                                                      | `feed.service.ts:29–55`                                                                | §8       |
| Two-sided ratings: complete backend, zero UI, and no anti-gaming rules decided                                                                                                                              | `HANDOFF.md` gap #3                                                                    | §16      |
| Company team management: complete backend with RBAC, zero UI. Every employer is a one-person account                                                                                                        | `HANDOFF.md` gap #4                                                                    | §10      |
| Mobile register screen enforces `acceptTerms` with no link to any of the four `/legal/*` pages, which are web-only. Plausible app-store rejection                                                           | `HANDOFF.md` gap #5                                                                    | §18      |
| No mobile CV export; no mobile route for a shared job link `/j/[id]`                                                                                                                                        | `HANDOFF.md` gaps #6, #7                                                               | §5, §10  |
| 30 i18n keys flagged `unreconciled`; platform-only surface at 163 web / 100 mobile                                                                                                                          | `HANDOFF.md` gap #9                                                                    | §19      |
| Wallet payment methods (`JAWWALPAY`, `PALPAY`, `REFLECT`) exist as enum members and env keys, with a `WALLET_METHODS` set in `billing.service.ts` — but **no provider adapter exists for any of the three** | `apps/api/src/modules/billing/wallets.ts:24–26` declares only labels and env-key names | §13      |
| `Plan.currency` and `Invoice.currency` default to `"USD"` in a market whose statutory wage is denominated in ILS                                                                                            | `schema.prisma` `Plan`, `Invoice`                                                      | §13      |

## 1.5 The design system

`packages/ui-tokens/src/index.ts` is the single source of truth and is genuinely enforced — `tokens.css` is generated by **`scripts/build-tokens.mjs` at the repo root** — note that `docs/HANDOFF.md` cites it as `packages/ui-tokens/scripts/build-tokens.mjs`, which does not exist; the root path is the real one, and this is a documentation defect P0 fixes. `pnpm check:tokens` fails CI on drift.

**Palette:** brand is deep olive (`brand-600 = #526030`), accent is terracotta (`accent-600 = #a8482c`), ink is warm (`#1a1a17`), surfaces are warm off-white (`#ffffff`, `#faf9f5`, `#f1efe7`, `#ebe8dc`). There is no dark mode and `project-spec.md` forbids adding one without approval. There is exactly one decorative gradient in the entire system (`cover.gradient`, olive-500 → olive-700).

**Type:** IBM Plex Sans Arabic for UI, Noto Naskh Arabic for body. Eight-step scale from `display/36` down to `micro/11`, where `micro` is explicitly the floor and nothing may go below it.

**Space:** 4px unit scale, 0–24 (0–96px).

**Surfaces:** five variants — `flat`, `card`, `hero`, `tinted`, `row` — with an explicit anti-pattern warning against wrapping everything in `card`.

**Signature pattern:** DESIGN.md §6 defines a seven-element "field-row composition" that every screen composes from. New screens must compose from this kit, not invent a layout. **This constraint governs every screen §5–§18 adds.**

**Parity:** `check:ui-lockstep` reported 3 known drift entries for three sprints and now reports **0**. Every remaining one-platform component carries a written reason. Any new component this plan adds to `ui-web` must ship its `ui-native` twin in the same commit with identical prop and variant names.

**Semantic colour defect, inherited:** audit A6 tuned each light semantic to ~4.5:1 against its own translucent tint **over white only**. Measured against the warm surfaces that actually exist: `success` falls to 3.92:1 on `sunken`, `info` to 4.25:1. Only `danger` holds everywhere. `warning` was fixed (`#926516` → `#7e5713`). §B.1 of the design redesign spec fixes `success` and `info` the same way, because the new surfaces this plan adds _will_ place them on `muted` and `sunken`.

## 1.6 Launch blockers already on record

`apps/api/src/config/env.ts:76–146` hard-fails production boot when any of these is unset. They are owner-supplied and none of them is code:

`CORS_ORIGINS` · `BAYDAR_WEB_URL` · `INTERNAL_CRON_TOKEN` · `RESEND_API_KEY` + `MAIL_FROM` · `HYPERPAY_ENTITY_ID`/`_ACCESS_TOKEN`/`_WEBHOOK_SECRET` · `BANK_TRANSFER_IBAN` + `_BENEFICIARY` · `CLAMAV_SCAN_URL` + `CLOUDFLARE_IMAGES_SCAN_URL` · `SENTRY_DSN` + `SENTRY_RELEASE`

Plus, not env-gated at boot: Apple Team ID, Android SHA-256 fingerprints, EAS project id and signing credentials, production PostHog values, both Render crons, the staging API hostname, physical-device smoke evidence, native-speaker Arabic copy review of 47 collected strings, and legal counsel review of the v0.1 placeholder legal copy.

§21 folds these into one register together with the eleven new owner-inputs this plan creates.
