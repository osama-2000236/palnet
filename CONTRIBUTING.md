# Contributing

This project is driven by a solo builder + AI pair-programmers. The rules below exist so AI output stays consistent.

## Before You Prompt Any AI

1. Open [`project-spec.md`](project-spec.md). Paste the prompt prefix from §6 verbatim.
2. Name the exact sprint (see [`docs/sprint-plan.md`](docs/sprint-plan.md)).
3. Name the exact files in scope.
4. Tell the AI to output diffs only, no prose.

## Branching

- `main` is protected. No direct pushes.
- Branch names: `feature/<scope>-<slug>`, `fix/<scope>-<slug>`, `chore/<slug>`, `docs/<slug>`.
- Rebase onto `main` before opening a PR; squash-merge on green.

## Commit Messages (Conventional Commits)

```
feat(auth): add JWT refresh rotation
fix(feed): respect block list in cursor query
chore(ci): cache pnpm store
docs(erd): note soft-delete invariants
refactor(profile): split headline validator
test(auth): cover refresh revocation edge case
```

## Adding a Dependency

Every new dependency requires:

- A one-line justification in the PR description.
- A mention in `project-spec.md §2.1` if it becomes a locked choice.
- No duplicate purpose: if we already have a library that does X, use it.

Banned dependency categories until otherwise approved:

- Alternate ORMs (Drizzle, TypeORM, Kysely, Sequelize).
- Alternate form libs (Formik, RHF is fine but use Zod resolver).
- Alternate validation libs (Yup, Joi, Valibot).
- UI kit libs besides the locally-built `@baydar/ui-web` and `@baydar/ui-native` primitives.
- State managers besides Zustand (client) + React Query (server state).

## Code Review Checklist

Before requesting merge:

- [ ] Definition of Done in `project-spec.md §7` met.
- [ ] `pnpm lint:tokens && pnpm format:check && pnpm lint && pnpm type-check && pnpm test` all pass locally.
- [ ] No hardcoded strings in components — all via `t()`.
- [ ] No `left`/`right` CSS — logical properties only.
- [ ] Every new endpoint is in Swagger and `docs/api-contract.md`.
- [ ] Prisma migration committed if schema changed.
- [ ] Zod schema added/updated in `@baydar/shared` if API shape changed.

## Asking for Help

If you're blocked on a decision:

1. Re-read `project-spec.md`.
2. Re-read the sprint's Do/Do NOT list.
3. If still unclear, open a GitHub Discussion — do not make an ad-hoc decision during a vibe-coding session.

## What Not To Do

- Do not commit `.env.local` or any real secret.
- Do not reintroduce anything in `project-spec.md §8` (deferred list).
- Do not split services or stand up alternate runtimes without an accepted ADR.
- Do not run `git push --force` against `main`.
