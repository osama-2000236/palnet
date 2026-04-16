# Changelog

All notable changes to PalNet are documented here. Format follows Keep a Changelog.

## [Unreleased]

### Added (Sprint 0 — Foundation)
- Monorepo skeleton: Turborepo + pnpm workspaces.
- `packages/shared` — Zod schemas for auth, user, profile, connection, post, interaction, message, notification, job, company.
- `packages/db` — Prisma schema with all day-one entities, singleton Prisma client, dev seed.
- `packages/config` — base tsconfig, Nest/Next/Expo tsconfigs, eslint preset, Tailwind preset.
- `packages/ui-tokens` — shared runtime tokens for colors, spacing, radius, typography, locale.
- `project-spec.md` — authoritative contract for AI prompts.
- `docs/` — ERD, sprint plan, API contract, design system, localization, testing, deployment.
- GitHub Actions CI: install → lint → type-check → test → build-web → e2e-web.
- `.env.example`, `.gitignore`, `.editorconfig`, `.prettierrc.json`, `.nvmrc`.

### Removed
- Prior enterprise README (AWS EKS / Kafka / Neptune / multi-service program) — incompatible with day-one scope.

### Next (Sprint 1)
- Auth module in `apps/api`.
- Onboarding flow in `apps/web` and `apps/mobile`.
