# Baydar — Arabic-First Professional Network

> Brand: **Baydar (بيدر)**. Pre-launch. Current branch of record: `main`.

Baydar is an Arabic-first, RTL-native professional network for Palestine first. It is shipped from a Turborepo monorepo with a Next.js web app, an Expo React Native mobile app, a NestJS API, Prisma/Postgres, and shared design-system packages.

## Read These First

1. [`project-spec.md`](project-spec.md) — current architecture and implementation guardrails.
2. [`DESIGN.md`](DESIGN.md), [`BRAND.md`](BRAND.md), [`docs/design/RTL.md`](docs/design/RTL.md), [`docs/design/MOBILE.md`](docs/design/MOBILE.md) — product, visual, RTL, and mobile rules.
3. [`docs/HANDOFF.md`](docs/HANDOFF.md) — current shipped state and remaining follow-ups.
4. [`docs/api-contract.md`](docs/api-contract.md), [`docs/erd.md`](docs/erd.md), [`docs/deployment.md`](docs/deployment.md), [`docs/testing-strategy.md`](docs/testing-strategy.md) — implementation references.

## Current Stack

| Layer            | Current choice                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Monorepo         | Turborepo + pnpm 9 workspaces                                                                      |
| Web              | Next.js 15 App Router, React 19, Tailwind, `next-intl`, `@baydar/ui-web`                           |
| Mobile           | Expo SDK 54, React Native 0.81, React 19, Expo Router, NativeWind host styles, `@baydar/ui-native` |
| API              | NestJS 10 modular monolith, REST, Swagger, SSE for live events                                     |
| Database         | PostgreSQL 16 via Prisma 5 in `@baydar/db`                                                         |
| Shared contracts | Zod schemas and formatters in `@baydar/shared`                                                     |
| Auth             | Self-managed JWT access/refresh tokens with bcrypt                                                 |
| Media            | Cloudflare R2 signed uploads, blurhash placeholder support                                         |
| Notifications    | In-app notifications, SSE streams, Expo push device registration                                   |
| Observability    | Pino API logs, Sentry/PostHog hooks where configured                                               |

## Monorepo Layout

```text
C:\LinkedIn\
  apps/
    api/        # NestJS REST API + Swagger + SSE streams
    web/        # Next.js 15 web app
    mobile/     # Expo SDK 54 app
  packages/
    shared/     # Zod schemas, enums, formatters
    db/         # Prisma schema, migrations, generated client wrapper
    config/     # shared eslint/tsconfig/tailwind presets
    ui-tokens/  # token source of truth
    ui-web/     # shared web UI atoms/molecules/organisms
    ui-native/  # shared native UI atoms/molecules/organisms
  docs/
```

## Local Setup

```powershell
pnpm install --frozen-lockfile
pnpm --filter @baydar/db generate
pnpm type-check
pnpm test
```

Run the apps in separate terminals:

```powershell
pnpm --filter @baydar/api dev
pnpm --filter @baydar/web dev
pnpm --filter @baydar/mobile start
```

## Verification Gates

Before a change is considered valid:

```powershell
pnpm lint:tokens
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm --filter @baydar/db generate
```

Mobile bundle evidence is valuable before release: run Expo iOS and Android dev exports when time and machine state allow.

## Status

`main` currently reflects Sprints 7-11.5 plus cleanup commit `1318d43`:

- Web and mobile app shells are present.
- Feed, profiles, connections, messages, jobs, notifications, search, media upload scaffolding, deep links, push device registration, and mobile recovery paths are implemented for the current pre-launch line.
- Token lint, formatting, type-check, and tests are expected to pass from a restored pnpm install.
- Known gaps remain in [`docs/HANDOFF.md`](docs/HANDOFF.md): real-device manual smoke evidence and thin native branch coverage.

## Cleanup Policy

Generated agent worktrees, Codex run outputs, logs, local env files, build artifacts, coverage, and dependency folders are not source. They are ignored and may be removed at any time. See [`docs/repo-cleanup-2026-04-28.md`](docs/repo-cleanup-2026-04-28.md) for the current cleanup record.
