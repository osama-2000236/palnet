# project-spec.md — Current Source of Truth

> This file reflects the accepted `main` state after the April 28, 2026 cleanup. If it conflicts with older sprint docs, this file wins.

## Product

- **Name:** Baydar (بيدر)
- **Mission:** Arabic-first professional networking for Palestine first.
- **Default locale:** `ar-PS`; English is a fallback.
- **Default direction:** RTL.
- **Design authority:** `DESIGN.md`, `BRAND.md`, `docs/design/RTL.md`, `docs/design/MOBILE.md`, and the archived prototype at `docs/_archive/prototype-2025/Baydar Prototype.html`.

## Locked Stack

| Layer            | Choice                                                                            |
| ---------------- | --------------------------------------------------------------------------------- |
| Node             | >=20                                                                              |
| Package manager  | pnpm 9                                                                            |
| Monorepo         | Turborepo                                                                         |
| Web              | Next.js 15 App Router, React 19, Tailwind CSS, `next-intl`                        |
| Mobile           | Expo SDK 54, React Native 0.81, React 19, Expo Router, NativeWind in host screens |
| API              | NestJS 10 modular monolith                                                        |
| API protocol     | REST + Swagger; live events via SSE                                               |
| Database         | PostgreSQL 16, Prisma 5                                                           |
| Shared contracts | Zod schemas in `@baydar/shared`                                                   |
| Auth             | Self-managed JWT access/refresh tokens, bcrypt passwords                          |
| Media            | Cloudflare R2 signed upload URLs, blurhash placeholders                           |
| Push             | Expo push device tokens and best-effort Expo fanout                               |
| State/data       | TanStack Query, Zustand where local client state is needed                        |
| UI               | `@baydar/ui-web`, `@baydar/ui-native`, `@baydar/ui-tokens`                        |
| Testing          | Jest, React Testing Library, Playwright, token lint, mobile recovery checks       |

Do not reintroduce GraphQL, Kafka, Neptune, EKS, OpenSearch, microservices, dark mode, Tailwind blue, or a themed UI kit without explicit approval.

## Architecture Rules

- The API remains one NestJS modular monolith under `apps/api`.
- API routes live under `/api/v1`; Swagger is served at `/api/docs`.
- Live messaging and notification updates use SSE endpoints owned by the API. Legacy socket transports are not active in current app flows.
- Prisma access goes through `@baydar/db`; app code must not create ad-hoc Prisma clients.
- DTOs and request validation originate in `@baydar/shared/src/schemas`.
- UI tokens are the source of truth for color, spacing, typography, radius, and shadows.
- Web and mobile component APIs should stay in lockstep when a shared design-system component exists on both platforms.
- Arabic strings are authored first. Do not hardcode user-facing English inside components.
- Use logical CSS properties and RTL-safe layout rules only.

## Workspace Names

- Apps: `@baydar/api`, `@baydar/web`, `@baydar/mobile`
- Packages: `@baydar/shared`, `@baydar/db`, `@baydar/config`, `@baydar/ui-tokens`, `@baydar/ui-web`, `@baydar/ui-native`

## Current Feature Surface

The current `main` line includes:

- Auth register/login/refresh/logout/me flows.
- Profile onboarding/editing and public profile routes.
- Feed, posts, reactions, comments, repost hooks, media upload URL generation.
- Connections, suggestions, requests, and blocking primitives.
- Direct messages, read state, typing events, room archive support, and SSE clients.
- Notifications, device token registration, and Expo push fanout.
- Jobs list/detail/apply with cover-letter support.
- Search, shared Arabic number/date formatting, and tokenized web/mobile UI atoms.
- Mobile deep links, offline banner, haptics, pull-to-refresh, and Expo Go recovery guardrails.

## Definition of Done

For feature work:

1. Prisma migration committed when schema changes.
2. Zod schema updated when request/response shape changes.
3. API service/controller tests cover happy path and important failure paths.
4. Web or mobile user-facing flow has Playwright, Jest, or manual smoke evidence appropriate to risk.
5. i18n keys are present in Arabic first and English fallback.
6. `pnpm lint:tokens`, `pnpm format:check`, `pnpm lint`, `pnpm type-check`, and `pnpm test` pass.
7. Relevant docs are updated in the same change.

## AI Prompt Prefix

Use this header for future coding prompts:

```text
You are contributing to Baydar, an Arabic-first RTL professional network in a Turborepo with Next.js 15 web, Expo SDK 54 mobile, NestJS REST API, Prisma/Postgres, and shared @baydar packages. Read project-spec.md, DESIGN.md, BRAND.md, docs/design/RTL.md, and docs/HANDOFF.md first. Do not introduce new dependencies, UI styles, public API shapes, or architectural patterns unless the request explicitly asks for them. Tokens and i18n are mandatory.
```

## Deferred Until Explicitly Approved

- Algorithmic ranking beyond the current pragmatic feed behavior.
- Premium subscriptions, billing, ads, recruiter workspace, learning, newsletters, and creator analytics.
- Third-party verification programs.
- Video transcoding pipeline.
- Service decomposition or alternate database/search infrastructure.
