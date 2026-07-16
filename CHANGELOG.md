# Changelog

All notable Baydar changes are documented here.

## [Unreleased]

### Added

- Arabic search folding: `baydar_fold()` SQL function + rebuilt FTS GIN indexes and folded query side across people/posts/companies/jobs search and the jobs-list filter, so hamza/teh-marbuta/tashkeel variants match (احمد ↔ أحمد). JS twin `foldArabic()` powers `normalizeCity` and client suggestions.
- Jobs sector facet (`GET /jobs?industry=`) with `PS_INDUSTRIES` (NGO/international organizations first), filter UI on web + mobile, and canonical suggestions on the company form.
- Palestinian university suggestions in the education editors (web datalist, mobile fold-filtered chips) from the previously-unused `PS_UNIVERSITIES`.

### Removed

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
