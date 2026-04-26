# Baydar — Palestine's Professional Network

> Brand: **Baydar (بيدر)**. Pre-launch.

A LinkedIn-equivalent professional network built **for Palestine first**: Arabic-first, RTL-native, mobile-forward, shippable by a solo builder with AI pair-programmers (Codex + Gemini) orchestrated by Claude as architect/reviewer.

**This repository is a day-one pragmatic build, not an enterprise program.** Any reintroduction of microservices, Kafka, EKS, Neptune, or GraphQL federation is out of scope until product-market fit is proven.

## Read These First — In Order

1. [`project-spec.md`](project-spec.md) — **the single source of truth.** Feed this file to every AI prompt before generating code. Contains locked stack, conventions, and prompt guardrails.
2. [`docs/erd.md`](docs/erd.md) — Entity relationship diagram and Prisma schema walkthrough.
3. [`docs/sprint-plan.md`](docs/sprint-plan.md) — Sprint 1 through 5 with explicit "build now" / "do not build yet" lists.
4. [`docs/api-contract.md`](docs/api-contract.md) — REST endpoints, request/response DTOs, WebSocket events.
5. [`docs/design-system.md`](docs/design-system.md) — Atomic component inventory for web and mobile.
6. [`docs/localization-palestine.md`](docs/localization-palestine.md) — Arabic-first rules, RTL invariants, locale defaults, calendar and date conventions.
7. [`docs/testing-strategy.md`](docs/testing-strategy.md) — Jest, Playwright, Detox coverage rules.
8. [`docs/deployment.md`](docs/deployment.md) — Vercel, Render, Neon, EAS, Cloudflare R2 setup.

## Stack (Locked)

| Layer         | Choice                                                      | Reason                                                         |
| ------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Monorepo      | Turborepo + pnpm workspaces                                 | Fastest caching, de-facto standard for TS monorepos            |
| Backend       | NestJS + TypeScript (modular monolith)                      | DI, guards, pipes, OpenAPI out of the box; no microservice tax |
| DB            | PostgreSQL 16                                               | Managed via Neon; heavily trained in AI assistants             |
| ORM           | Prisma                                                      | Best schema DX, type-safe, AI-friendly                         |
| Web           | Next.js 15 (App Router) + Tailwind + shadcn/ui              | SEO for profiles + app shell; RTL-friendly                     |
| Mobile        | Expo (React Native) + NativeWind                            | iOS + Android from one codebase; OTA updates via EAS           |
| Validation    | Zod (shared in `packages/shared`)                           | One schema → DTO on server + form types on clients             |
| Real-time     | Socket.io                                                   | Battle-tested, simple rooms for DMs and notifications          |
| Auth          | JWT access+refresh, bcrypt, OAuth2 (Google)                 | No third-party auth dep; migration to Clerk/Auth.js reserved   |
| Media storage | Cloudflare R2 (S3-compatible)                               | Free egress, cheaper than S3                                   |
| Hosting — web | Vercel                                                      | Zero-config Next.js, global edge                               |
| Hosting — API | Render                                                      | Dockerized Nest, zero-devops, cheap                            |
| Hosting — DB  | Neon                                                        | Serverless Postgres, branch-per-PR                             |
| Mobile build  | EAS (Expo Application Services)                             | Managed native builds + OTA                                    |
| CI            | GitHub Actions                                              | Standard; runs lint + type-check + Jest + Playwright           |
| i18n          | `next-intl` (web), `i18next` + `expo-localization` (mobile) | Arabic default, English secondary                              |

## Monorepo Layout

```text
C:\LinkedIn\
  apps/
    web/        # Next.js 15 — SSR profiles, app shell, admin pages
    mobile/     # Expo — iOS + Android
    api/        # NestJS — REST + WebSockets + Swagger
  packages/
    shared/     # Zod schemas, DTOs, domain types, constants
    db/         # Prisma schema + generated client + migrations
    config/     # eslint, prettier, tsconfig base, tailwind preset
    ui-tokens/  # Shared design tokens (colors, spacing, typography)
  docs/
    erd.md
    sprint-plan.md
    api-contract.md
    design-system.md
    localization-palestine.md
    testing-strategy.md
    deployment.md
  .github/workflows/
    ci.yml
  project-spec.md   # THE anchor — feed to every AI prompt
  turbo.json
  pnpm-workspace.yaml
  package.json
```

## What Got Cut (and Why)

The prior README described an AWS EKS / Kafka / Neptune / OpenSearch / Aurora / multi-Python-ML-service program requiring 8+ engineers and multiple quarters. It was removed because it is incompatible with "day-one ready, solo + AI" execution. Service-oriented and ML-ranked variants are documented as **post-PMF options**, not day-one work.

## What Will Be Built, In Order

1. **Sprint 0** — Foundation: monorepo scaffold, Prisma schema, shared Zod package, CI, Swagger shell, RTL-safe Tailwind tokens.
2. **Sprint 1** — Auth + profile onboarding (web + mobile).
3. **Sprint 2** — Feed: post text/media, chronological feed, like.
4. **Sprint 3** — Profiles + connections graph.
5. **Sprint 4** — Messaging + notifications (Socket.io).
6. **Sprint 5** — Jobs board + applications.
7. **Sprint 6+** — Company pages, groups, verification, premium (post-PMF).

See [`docs/sprint-plan.md`](docs/sprint-plan.md) for the exact "do / do not" per sprint.

## How To Use This With Codex and Gemini

Every prompt to Codex or Gemini must start with:

```
You are contributing to Baydar, a Turborepo + NestJS + Next.js + Expo
monorepo. The authoritative contract is in project-spec.md at the repo
root — obey it. Do not introduce new dependencies, patterns, or
services unless the spec allows it. Types come from packages/shared.
DB access goes through @baydar/db. All UI copy must be i18n-keyed
(default locale ar-PS, RTL).
```

The rest of the prompt is the feature ask. That single prefix is what keeps AI output converging.

## Status (as of 2026-04-26)

- System renamed to **Baydar** end-to-end (packages, bundle ids, storage keys, log prefixes, R2 bucket, fixtures, deploy domains, CI DB)
- Tokens locked (`packages/ui-tokens/src/index.ts`)
- Brand mark unified (wheat on olive circle) across web + native + favicons + Expo
- Web + mobile profile use tabbed sections
- Mobile feed uses StyleSheet (no inline objects)
- PWA manifest live at `/manifest.webmanifest`
- Original prototype archived at `docs/_archive/prototype-2025/`
