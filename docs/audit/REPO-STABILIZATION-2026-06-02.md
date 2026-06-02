# Repo Stabilization Audit — 2026-06-02

## Summary

Stabilization branch: `codex/repo-stabilization-cleanup`.

Outcome: compile blockers from the Claude dirty tree were repaired, fake production placeholder routes were removed, viewer-scoped cache headers were locked down, web auth refresh was unified across API helpers, and the main validation gate is green.

## Salvaged And Fixed

- Kept useful CI/deploy/design-system hardening already present in the dirty tree after it passed the gate.
- Fixed web feed to use `GET /api/v1/feed`, the shared `Post` schema, and the real `PostCard post` prop.
- Fixed messages page syntax and SSE wiring, using the existing `openStream` helper.
- Removed `next/image` from `@baydar/ui-web` primitives so shared web UI stays framework-neutral.
- Unified web refresh behavior for `apiFetch`, `apiFetchPage`, and `apiCall`; blank localStorage access tokens now refresh instead of stalling app loaders.
- Changed viewer-scoped job/profile responses to `Cache-Control: private, no-store`.
- Removed fake-data production routes for web/mobile saved pages, employer billing placeholders, `/me` placeholder pages, and onboarding success placeholders.
- Removed generated/local artifacts: `.codex/`, `fix.js`, `fix2.js`, `.backup` files, `PLAN.md`, and accidental nested `packages/ui-tokens/ui-tokens/`.

## Validation Evidence

- `pnpm lint:tokens` — pass.
- `pnpm format:check` — pass.
- `pnpm lint` — pass.
- `pnpm type-check` — pass.
- `pnpm test` — pass.
- `pnpm check:release-placeholders` — pass.
- `pnpm --filter @baydar/web test:a11y` — pass; 26 passed, 16 skipped by existing project scoping / seeded job availability.

Focused additions:

- `apps/web/src/lib/__tests__/api-refresh.test.ts` covers refresh/retry for `apiFetch`, `apiFetchPage`, and `apiCall`.
- `apps/api/src/modules/viewer-cache-control.spec.ts` prevents public caching on viewer-scoped job/profile responses.

## Cleanup Manifest

Deleted locally:

- Worktree `C:/LinkedIn/.claude/worktrees/charming-kirch-7d8d02`.
- Local branch `claude/charming-kirch-7d8d02` because it was clean and merged at `main`.

Retained locally because worktree has uncommitted changes:

- `worktree-audit-nplusone` at `C:/LinkedIn/.claude/worktrees/audit-nplusone`.

Retained locally because branches are gone upstream but not merged into `main`:

- `claude/cranky-bardeen-7812e4`
- `claude/nostalgic-wu-0d4ff9`
- `claude/wizardly-thompson-38c641`

Open GitHub PRs retained pending explicit cleanup-manifest approval:

- #21 `claude/angry-almeida-9dc83e` → `main`
- #22 `claude/adoring-pare-2bf794` → `main`
- #24 `claude/design-pass1-salvage` → `main`
- #27 `ci/composite-action-turbo-cache` → `main`
- #28 `deploy/guard-and-blueprints` → `ci/composite-action-turbo-cache`
- #29 `claude/heuristic-kirch-17a295` → `main`
