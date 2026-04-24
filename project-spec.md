# project-spec.md — Single Source of Truth

> **Every AI prompt (Codex, Gemini, Claude) must be prefixed with the contents of this file or a link to it.** When this file conflicts with anything else in the repo, this file wins. Update this file before you change the plan, not after.

Last locked: 2026-04-16.

---

## 1. Product Identity

- **Codename:** `palnet`
- **Mission:** A LinkedIn-equivalent professional network for Palestine first. Arabic-first, RTL-native, mobile-forward.
- **Scope parity with LinkedIn (copy these flows):** auth, onboarding, public + authenticated profiles, connections graph (request/accept/withdraw/block), home feed (posts, images, video URLs, reactions, comments, reposts), direct messaging (1:1), notifications, unified search (people, posts, jobs, companies), jobs board + applications, company pages.
- **Out of day-one scope:** premium subscriptions, ads platform, recruiter workspace, learning, creator analytics, newsletters, verification partners, algorithmic ranking. These are reserved for post-PMF.

---

## 2. Non-negotiable Decisions

These are locked. Do not reopen without explicit user approval.

### 2.1 Stack

| Layer                 | Choice                                                | Version (April 2026)                                        |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Node                  | 20 LTS                                                | `.nvmrc = 20`                                               |
| Package manager       | pnpm                                                  | 9.x                                                         |
| Monorepo orchestrator | Turborepo                                             | 2.x                                                         |
| Backend framework     | NestJS                                                | 10.x                                                        |
| Backend runtime       | Node 20                                               | —                                                           |
| ORM                   | Prisma                                                | 5.x                                                         |
| DB                    | PostgreSQL                                            | 16                                                          |
| Web framework         | Next.js                                               | 15.x (App Router)                                           |
| Mobile framework      | Expo                                                  | SDK 52 (RN 0.76)                                            |
| Styling (web)         | Tailwind CSS + shadcn/ui                              | TW 3.x                                                      |
| Styling (mobile)      | NativeWind                                            | 4.x                                                         |
| Validation            | Zod                                                   | 3.x                                                         |
| Realtime              | Authenticated SSE / EventSource                       | Native browser support, enough for beta DMs + notifications |
| Auth                  | Self-managed JWT + bcrypt, OAuth2 Google (Sprint 1.5) | —                                                           |
| Media                 | Cloudflare R2 via `@aws-sdk/client-s3`                | —                                                           |
| Hosting — web         | Vercel                                                | —                                                           |
| Hosting — API         | Render (Docker)                                       | —                                                           |
| Hosting — DB          | Neon                                                  | —                                                           |
| Mobile build          | EAS                                                   | —                                                           |
| CI                    | GitHub Actions                                        | —                                                           |
| i18n web              | `next-intl`                                           | —                                                           |
| i18n mobile           | `i18next` + `react-i18next` + `expo-localization`     | —                                                           |
| Testing               | Jest, React Testing Library, Playwright, Detox        | —                                                           |

### 2.2 Architecture

- **Modular monolith** for the API. One NestJS app, modules per domain (`auth`, `users`, `profiles`, `connections`, `posts`, `interactions`, `messages`, `notifications`, `jobs`, `applications`, `companies`, `media`, `search`). **Do not split into microservices.**
- **REST + OpenAPI/Swagger**, not GraphQL. Nest's `@nestjs/swagger` auto-generates the spec.
- **Authenticated SSE / EventSource** only for live DMs and notifications. Everything else is REST.
- **Shared DTO contract:** every request/response body has a matching Zod schema in `packages/shared/src/schemas/`. Nest imports the schema with `nestjs-zod` and uses the inferred type. Next.js and Expo import the same schema for forms.
- **DB access only through `@palnet/db`** (a workspace package wrapping Prisma). No direct `new PrismaClient()` anywhere in app code.
- **Auth:** JWT access (15 min) + refresh (30 day, rotated). Refresh tokens stored hashed in Postgres with device id. Passwords bcrypt cost 12.
- **RBAC roles:** `USER`, `COMPANY_ADMIN`, `MODERATOR`, `ADMIN`. Nest guards enforce role on protected routes.
- **Pagination:** cursor-based (`after: string | null`, `limit: 20`) for feeds, connections, messages, search. Offset pagination is banned for anything that can grow.

### 2.3 Naming & Conventions

- TypeScript strict mode on everywhere. No `any` without an eslint-disable with a reason comment.
- Filenames `kebab-case`, React components `PascalCase` inside `PascalCase.tsx`.
- API routes plural nouns: `/api/v1/users`, `/api/v1/posts/:id/comments`.
- Env vars `SCREAMING_SNAKE_CASE`, validated at boot via Zod in `apps/api/src/config/env.ts`.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Branches: `feature/<scope>-<slug>`, `fix/<scope>-<slug>`, `chore/<slug>`. Never commit to `main`.

### 2.4 Localization Invariants

- Default locale: `ar-PS`. Fallback: `en`. Direction defaults to `rtl`; flipped for `en`.
- All UI strings go through `t('namespace.key')`. No hardcoded copy in JSX.
- Dates default to Gregorian with Arabic numerals. User-facing time uses relative format (`منذ 3 دقائق`).
- Phone numbers render E.164. Palestinian defaults to `+970`.
- See [`docs/localization-palestine.md`](docs/localization-palestine.md) for the full rule list.

### 2.5 Security Baselines

- Helmet + CORS allow-list in Nest.
- Rate limit: 100 req/min per IP global, 10/min on auth routes (`@nestjs/throttler`).
- Input validation: Zod at every controller boundary via `ZodValidationPipe`.
- Output: never return `password`, `refreshTokenHash`, `email` (to non-owners).
- Secrets: `.env.local` is gitignored. Prod secrets in Render/Vercel env panels. Never in code.
- File uploads: signed PUT URLs to R2, server validates mime + size before issuing.

---

## 3. Monorepo Layout

```
C:\LinkedIn\
  apps/
    web/                # Next.js 15
    mobile/             # Expo
    api/                # NestJS
  packages/
    shared/             # Zod schemas, DTO types, enums, constants
      src/
        schemas/        # user.ts, profile.ts, post.ts, ...
        enums.ts
        index.ts
    db/                 # Prisma
      prisma/
        schema.prisma
        migrations/
      src/index.ts      # export { prisma } — singleton client
    config/             # tsconfig.base.json, eslint-preset.js, tailwind-preset.js
    ui-tokens/          # colors, spacing, typography tokens (consumed by web+mobile)
  docs/
  .github/workflows/
  project-spec.md       # this file
  turbo.json
  pnpm-workspace.yaml
  package.json
  .nvmrc
  .gitignore
  .editorconfig
```

Workspace names:

- `@palnet/web`, `@palnet/mobile`, `@palnet/api`
- `@palnet/shared`, `@palnet/db`, `@palnet/config`, `@palnet/ui-tokens`

---

## 4. Domain Entities (Prisma-backed)

Full schema lives in [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma). Detailed walkthrough in [`docs/erd.md`](docs/erd.md).

Entities (day-one): `User`, `Profile`, `Experience`, `Education`, `Skill`, `ProfileSkill`, `Connection`, `Post`, `Media`, `Reaction`, `Comment`, `Repost`, `Message`, `ChatRoom`, `ChatRoomMember`, `Notification`, `Job`, `Application`, `Company`, `CompanyMember`, `RefreshToken`, `BlockedUser`, `Report`.

Invariants:

- Every table has `id` (cuid), `createdAt`, `updatedAt`.
- Soft delete via `deletedAt: DateTime?` on `User`, `Post`, `Comment`, `Message`, `Job`.
- Cascade deletes: `Profile`, `RefreshToken`, `ProfileSkill`, `Experience`, `Education` cascade on User deletion.
- Enums live in Prisma and re-export via `@palnet/shared/enums`.

---

## 5. API Surface Rules

- Base path: `/api/v1`
- Always return `{ data, meta }` on success, `{ error: { code, message, details? } }` on error.
- Error codes are enum strings (`AUTH_INVALID_CREDENTIALS`, `PROFILE_NOT_FOUND`, etc.) defined in `@palnet/shared/enums`.
- SSE streams: `/messaging/stream`, `/notifications/stream`. Both accept standard bearer auth and the browser fallback `?access_token=` for `EventSource`.

Full endpoint list in [`docs/api-contract.md`](docs/api-contract.md).

---

## 6. AI Prompt Prefix (Required Header)

Paste this verbatim before any feature prompt to Codex/Gemini/Claude:

```
Project: palnet (LinkedIn clone, Palestine first).
Repo: C:\LinkedIn (Turborepo monorepo, pnpm workspaces).
Authoritative spec: project-spec.md (read it before answering).

Hard rules (do not violate):
1. Stack is locked in project-spec.md §2.1. Do NOT add new libs without approval.
2. Backend is ONE NestJS app (modular monolith). No microservices.
3. REST + Swagger, no GraphQL.
4. All DTOs come from Zod schemas in packages/shared/src/schemas.
5. DB access only via @palnet/db.
6. Default locale is ar-PS with RTL. Every UI string is t('...') keyed.
7. TypeScript strict. No `any` without eslint-disable + reason.
8. Cursor pagination for lists; offset pagination is banned.
9. Errors shaped { error: { code, message, details? } } with code from enums.
10. Shared types flow: Prisma → @palnet/db → Zod schemas in @palnet/shared → consumed by api/web/mobile.

Output: write code diffs only for files in scope. No prose.
```

---

## 7. Definition of Done (per feature)

A feature ships only when all seven are true:

1. Prisma migration applied and committed.
2. Zod schema added/updated in `packages/shared`.
3. Nest module: controller + service + DTOs + guards. Swagger decorators on every route.
4. Jest unit tests for the service (success + two failure cases minimum).
5. At least one Playwright E2E (web) or Detox (mobile) path if user-facing.
6. i18n keys added to `ar.json` and `en.json`. No untranslated strings.
7. CI green: lint, type-check, test, build all pass.

---

## 8. Things That Are Explicitly Deferred

Do not build these before Sprint 6 even if asked:

- Algorithmic feed ranking (day-one is chronological with a tiny recency+affinity tiebreak).
- Premium subscriptions, billing, entitlements.
- Recruiter workspace, ads manager, learning courses.
- Verified badges with third-party partners.
- Creator analytics dashboards.
- Video processing pipeline (upload MP4 URL only; no transcoding on day one).
- Neptune, Kafka, OpenSearch, EKS, Aurora, or any Python service.

If a sprint ticket starts needing any of the above, stop and escalate — the sprint is scoped wrong.

---

## 9. File Pointers

- [`README.md`](README.md) — orientation
- [`docs/erd.md`](docs/erd.md) — data model explanation
- [`docs/sprint-plan.md`](docs/sprint-plan.md) — build order
- [`docs/api-contract.md`](docs/api-contract.md) — endpoints
- [`docs/design-system.md`](docs/design-system.md) — atoms/molecules/organisms
- [`docs/localization-palestine.md`](docs/localization-palestine.md) — Arabic/RTL rules
- [`docs/testing-strategy.md`](docs/testing-strategy.md) — Jest/Playwright/Detox
- [`docs/deployment.md`](docs/deployment.md) — Vercel/Render/Neon/EAS/R2
