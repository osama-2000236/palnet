# project-spec.md — Current Source of Truth

> This file reflects the accepted `main` state after the April 28, 2026 cleanup. If it conflicts with older sprint docs, this file wins.

## Product

- **Name:** Baydar (بيدر)
- **Mission:** Arabic-first professional networking for Palestine first.
- **Default locale:** `ar-PS`; English is a fallback.
- **Default direction:** RTL.
- **Design authority:** `DESIGN.md`, `BRAND.md`, `docs/design/RTL.md`, `docs/design/MOBILE.md`, and the archived prototype at `docs/_archive/prototype-2025/Baydar Prototype.html`.

## Locked Stack

| Layer            | Choice                                                                      |
| ---------------- | --------------------------------------------------------------------------- |
| Node             | >=20                                                                        |
| Package manager  | pnpm 9                                                                      |
| Monorepo         | Turborepo                                                                   |
| Web              | Next.js 15 App Router, React 19, Tailwind CSS, `next-intl`                  |
| Mobile           | Expo SDK 54, React Native 0.81, React 19, Expo Router, RN StyleSheet        |
| API              | NestJS 10 modular monolith                                                  |
| API protocol     | REST + Swagger; live events via SSE                                         |
| Database         | PostgreSQL 16, Prisma 5                                                     |
| Shared contracts | Zod schemas in `@baydar/shared`                                             |
| Auth             | Self-managed JWT access/refresh tokens, bcrypt passwords                    |
| Media            | Cloudflare R2 signed upload URLs, blurhash placeholders                     |
| Push             | Expo push device tokens and best-effort Expo fanout                         |
| State/data       | TanStack Query, Zustand where local client state is needed                  |
| UI               | `@baydar/ui-web`, `@baydar/ui-native`, `@baydar/ui-tokens`                  |
| Testing          | Jest, React Testing Library, Playwright, token lint, mobile recovery checks |

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

## Approved And Not Yet Built — the occupation platform

Approved by the owner on 2026-07-30, in two steps the same day. Baydar's audience widens past
the salaried, CV-shaped worker to **every occupation this market has** — crafts and shops and
food businesses, and equally the accounting practices, law offices, engineering consultancies,
clinics and studios. Standing is earned from finished work a counterparty confirmed, and the
feed, job search and hiring surfaces all become evidence-driven rather than keyword-driven.

Three decision records, each authoritative in its lane:

| Doc                                                          | Owns                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [`docs/design/OCCUPATIONS.md`](docs/design/OCCUPATIONS.md)   | the naming spine, the occupation taxonomy, the three progression tracks, the craft ladder, business kinds |
| [`docs/design/FEED-RANKING.md`](docs/design/FEED-RANKING.md) | the behaviour-derived interest model and the ranked, finite, explainable feed                             |
| [`docs/design/MATCHING.md`](docs/design/MATCHING.md)         | structured job requirements, match scoring both ways, the structured application, applicant intelligence  |

Rationale and the crafts phase plan: [`docs/NEXT-SESSION-PROMPT.md`](docs/NEXT-SESSION-PROMPT.md) §B.

Non-negotiables that cut across all three:

- **One vocabulary.** `OCCUPATIONS.md` §0 is the naming spine; a lint gate enforces it. One
  concept, one word, identical in Prisma, Zod, REST, i18n and both UI kits.
- **One evidence primitive.** `WorkProof` is the only proof of work in the product. Three tracks
  differ only in how they summarise it: a peer-earned `Standing` (crafts), a verified `Licence`
  (licensed professions), or raw evidence (services). There is no second reputation system.
- **Standing is a credential, not a currency** — unspendable, unpurchasable, non-decaying, the
  opposite of Karama on every axis. If it can be bought, Baydar is selling trust.
- **Baydar does not out-rank a نقابة.** Licensed professions get licence verification, never an
  invented rank.
- **Ranking decides order, never volume, and never outcome.** The feed stays finite and
  explainable; no score may auto-reject an applicant; protected attributes are never inputs.
- Off-platform work confirmation needs phone OTP, so it needs an SMS credential. Every phase
  before that must be useful on on-platform records alone.
- Still out of scope, and not implied by any of the above: ordering, carts, delivery tracking,
  in-app payment for jobs, escrow. A bakery gets a profile and hires a baker; nobody orders
  through Baydar.

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

- Marketplace mechanics of any kind: ordering, carts, delivery tracking, in-app payment for
  craft work, escrow. Explicitly excluded from the crafts expansion above.
- ~~Algorithmic ranking beyond the current pragmatic feed behavior.~~ **Approved 2026-07-30** —
  see `docs/design/FEED-RANKING.md`. Ranked for relevance, still finite, always explainable, and
  session length is explicitly not an objective.
- Premium subscriptions, billing, ads, recruiter workspace, learning, newsletters, and creator analytics.
- Third-party verification programs.
- Video transcoding pipeline.
- Service decomposition or alternate database/search infrastructure.
