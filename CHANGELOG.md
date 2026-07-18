# Changelog

All notable Baydar changes are documented here.

## [Unreleased]

### Added

- Arabic search folding: `baydar_fold()` SQL function + rebuilt FTS GIN indexes and folded query side across people/posts/companies/jobs search and the jobs-list filter, so hamza/teh-marbuta/tashkeel variants match (احمد ↔ أحمد). JS twin `foldArabic()` powers `normalizeCity` and client suggestions.
- Jobs sector facet (`GET /jobs?industry=`) with `PS_INDUSTRIES` (NGO/international organizations first), filter UI on web + mobile, and canonical suggestions on the company form.
- Palestinian university suggestions in the education editors (web datalist, mobile fold-filtered chips) from the previously-unused `PS_UNIVERSITIES`.

### Removed

- Ponytail audit 5: deleted the non-functional `mobile-e2e.yml` scaffold workflow (verified a preview-build secret but never installed the APK or booted an emulator; `.maestro/` flows stay for local runs), the `MailService` delegation wrapper (consumers now `@Inject(MAIL_TRANSPORT)` directly), dead shared schemas (`schemas/user.ts` whole file, `BookmarkState`, `JobSearchQuery`, `ViewerConnectionState`), dead `formatCompact`, dead app-lib exports (`LinkingOptions`, `warningHaptic`/`errorHaptic` + the haptics table indirection, `apiErrorCode`, `THEME_CHOICES`), unread env vars (wallet `*_WEBHOOK_SECRET`/`*_BASE_URL`, Google OAuth trio — no OAuth code exists), the unused `@expo/vector-icons` mobile dep, and the internal-only `ILLUSTRATION_MOTIFS` barrel export. `lint:tokens` gained a preset-drift guard (every hex in `packages/config/tailwind-preset.js` must exist in ui-tokens source); `USER_PREMIUM_POINTS_PRICE` is now the single source for the premium points price (was hand-synced between `pricing.ts` and `karama.service.ts`).
- Ponytail audit 4: deleted the stale `design-handoff-2026-05/03-components/` + `04-screens/` source snapshots (~14.2k lines; referenced pain/problems/ask docs kept for the Pass 2 gate), the web write-only profile-completion cache and `clearDeviceId` in `lib/session.ts`, a twice-declared `CompanySearchRow` interface, a byte-copy premium `format.ts`, and the never-rendered Illustration `outline`/`block` direction kits (harvest-only now on web + native; kits recoverable from git history). Added shared `takePage()` and replaced the hand-rolled cursor-trim block in 8 list endpoints.
- Ponytail audit 3: deleted the stale `design-handoff-2026-05/code/` snapshot (merged into the repo tree 2026-06-04; AGENTS.md now points at the live tree), dead `NotificationsBell` (web) and `LanguageToggle` (mobile) components, and their orphaned mobile i18n keys (`common.language|arabic|english`).

### Fixed

- Settings → Security sessions list now formats "last active" with the page locale via shared `formatRelativeTime` (was browser-default `toLocaleString()`, rendering English dates on Arabic pages).
- Profile edit basics form rendered raw `onboarding.firstName`/`onboarding.lastName` i18n keys (`as never` casts had silenced the missing-key type error); keys added to both web locales.

### Changed

- Updated repo docs to reflect the real current `main` state after Sprint 11.5.
- Recorded the April 28, 2026 cleanup plan and branch/artifact pruning record.
- Replaced stale legacy product-name, old realtime, old UI-kit, old mobile SDK, legacy package-scope, and greenfield sprint references in active docs.

### Current Baseline

- Next.js 15 web app, Expo SDK 54 / React Native 0.81 mobile app, NestJS REST API, Prisma/Postgres, SSE live updates, JWT refresh auth, R2 media uploads, Expo push device registration.
- Verification gate: `pnpm lint:tokens`, `pnpm format:check`, `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm --filter @baydar/db generate`.
