# Testing Strategy

Testing is not optional — it is how we keep AI-generated code from silently breaking us. The rules below are minimum, not ceiling.

## Layers

| Layer | Tool | Lives in | Runs on |
| --- | --- | --- | --- |
| Unit | Jest + ts-jest | `apps/api/src/**/*.spec.ts`, `packages/*/src/**/*.spec.ts` | Every PR |
| Integration (API) | Jest + Supertest | `apps/api/test/**` | Every PR |
| E2E web | Playwright | `apps/web/e2e/**` | Every PR |
| E2E mobile | Detox | `apps/mobile/e2e/**` | Nightly + pre-release |
| Contract | `zod` schemas imported into both api + clients | N/A — type system does this | Build time |

## Mandatory Coverage Rules

- Every NestJS service method: one happy path + at least two failure cases (validation, unauthorized, conflict, etc.).
- Every controller: one integration test that asserts HTTP status and Zod-valid response shape.
- Every mutation endpoint: one Playwright or Detox path that exercises it from the UI for critical flows (auth, post, connect, message, apply).
- Every reducer/store slice (RTK or Zustand): unit-tested; no UI reliance.
- Visual regressions via Playwright screenshot baselines on the five anchor pages: `/login`, `/feed`, `/in/[handle]`, `/jobs`, `/messaging`. Both RTL and LTR.

## Jest Setup

- Strict TS via `ts-jest` in `@baydar/config` preset.
- `testEnvironment: "node"` for api + shared; `jsdom` for web utility tests; Detox-provided env for mobile.
- No snapshot testing for logic — only for component visual output.
- Database tests use a **separate test schema** on the Neon dev branch; reset between runs via `prisma migrate reset --skip-seed --force`. Do not mock Prisma.

## Playwright Setup

- Runs against a local stack brought up by `pnpm dev` in CI.
- Browsers: Chromium only in CI for speed; Firefox + WebKit locally before release.
- Every test must:
  1. Use `test.use({ locale: 'ar-PS' })` for primary run.
  2. Switch to `locale: 'en'` in a follow-up `test.describe` block for layout sanity.
- Visual snapshots stored in `apps/web/e2e/__snapshots__` and reviewed like code.

## Detox Setup

- iOS simulator + Android emulator images pinned in CI. Nightly job runs a smoke subset.
- Every Detox test begins with a seeded user logged in via API (no UI login) to keep runs fast.

## What Not to Test

- Do not test Prisma's own behavior.
- Do not test Zod's own behavior — assume `z.string().email()` works; test *that your schema composition is right*.
- Do not write tests that only assert "did this render without throwing" — that's what type-check + build already does.

## CI Gates

A PR merges only when:

1. `pnpm lint` — zero errors.
2. `pnpm type-check` — zero errors.
3. `pnpm test` — all unit + integration green.
4. `pnpm --filter @baydar/web e2e` — Playwright green (Chromium).
5. Build succeeds for `@baydar/api`, `@baydar/web`.

Mobile E2E (Detox) is a nightly job, not a PR gate, because simulator time is expensive. Manual smoke required before shipping mobile releases.

## Prompting AI for Tests

When asking Codex/Gemini to add tests, paste this block with the feature ask:

```
Write tests alongside the implementation:
- One Jest service spec: happy path + two failure cases.
- One Supertest integration spec: controller HTTP contract.
- If user-facing: one Playwright (web) or Detox (mobile) flow.
All tests must import Zod schemas from @baydar/shared for shape assertions, not re-declare them.
```
