# Changelog

All notable Baydar changes are documented here.

## [Unreleased]

### Changed

- Updated repo docs to reflect the real current `main` state after Sprint 11.5.
- Recorded the April 28, 2026 cleanup plan and branch/artifact pruning record.
- Replaced stale legacy product-name, old realtime, old UI-kit, old mobile SDK, legacy package-scope, and greenfield sprint references in active docs.

### Current Baseline

- Next.js 15 web app, Expo SDK 54 / React Native 0.81 mobile app, NestJS REST API, Prisma/Postgres, SSE live updates, JWT refresh auth, R2 media uploads, Expo push device registration.
- Verification gate: `pnpm lint:tokens`, `pnpm format:check`, `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm --filter @baydar/db generate`.
