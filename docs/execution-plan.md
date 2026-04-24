# Execution Plan

Locked order. No step starts until the previous is green.

## Phase 0 — Version control

- `git init` in `C:\LinkedIn`
- Commit 1: `chore: foundation docs and packages` (all Sprint 0 foundation files)

## Phase 1 — `apps/api` (NestJS)

Files:

- `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`
- `Dockerfile`, `.dockerignore`
- `.eslintrc.cjs`
- `jest.config.ts`
- `src/main.ts` — boots on `API_PORT`, Swagger at `/api/docs`, CORS allow-list, Helmet, Pino
- `src/app.module.ts` — wires `ConfigModule`, `ThrottlerModule`, `HealthModule`
- `src/config/env.ts` — Zod env validation
- `src/common/zod-pipe.ts` — Zod validation pipe
- `src/common/exception.filter.ts` — maps to `{ error: { code, message, details? } }`
- `src/common/logger.ts` — Pino with requestId
- `src/modules/health/*` — `GET /api/v1/health`

## Phase 2 — `apps/web` (Next.js 15 + Tailwind + next-intl)

Files:

- `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`
- `.eslintrc.cjs`
- `src/app/[locale]/layout.tsx` — `<html lang dir>` driven by locale
- `src/app/[locale]/page.tsx` — minimal landing
- `src/app/globals.css`
- `src/middleware.ts` — next-intl locale routing
- `src/i18n.ts` — next-intl config
- `messages/ar.json`, `messages/en.json`
- `src/lib/api.ts` — typed fetch wrapper (uses `@palnet/shared`)

## Phase 3 — `apps/mobile` (Expo SDK 52 + NativeWind + i18next)

Files:

- `package.json`, `tsconfig.json`, `app.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`
- `App.tsx` — root with i18n + RTL bootstrap
- `index.ts` — Expo entry
- `src/i18n/index.ts`, `src/i18n/ar.json`, `src/i18n/en.json`
- `src/lib/api.ts` — typed fetch wrapper

## Phase 4 — Boot verification (manual)

- `pnpm install`
- `pnpm db:generate`
- `pnpm --filter @palnet/api dev` → hit `http://localhost:4000/api/v1/health`
- `pnpm --filter @palnet/web dev` → hit `http://localhost:3000` (RTL renders)
- `pnpm --filter @palnet/mobile start` → Expo loads, RTL enabled

## Phase 5 — Commit 2

- `chore: app scaffolds (api, web, mobile) — Sprint 0 complete`

## After Phase 5 (Sprint 1 begins)

- Auth module in `apps/api` per `docs/sprint-plan.md` Sprint 1.
- Login/Register/Onboarding screens in web + mobile.

## Rules during execution

- No new libs outside `project-spec.md §2.1`.
- Every file typed strict. No `any`.
- Every user-facing string via `t()`.
- Every commit on a branch off `main`; `main` only receives squash-merges.
- Red CI blocks the next phase.
