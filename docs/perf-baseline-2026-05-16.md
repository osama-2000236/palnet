# Performance Baseline — 2026-05-16

Snapshot taken on branch `claude/heuristic-kirch-17a295`, commit-of-record
`6bb5c31` (head of `main` at session start). Used as the regression reference
for the multi-phase optimization plan in
`C:\Users\osama\.claude\plans\inspect-github-repo-and-vectorized-pond.md`.

## Verification gate (HANDOFF.md commands)

| Step                                | Result | Notes                                                                |
| ----------------------------------- | ------ | -------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`    | ✅     | Clean install, no peer-dep warnings raised.                          |
| `pnpm lint:tokens`                  | ✅     | `lint:tokens — clean.`                                               |
| `pnpm format:check`                 | ✅     | Background run, exit 0.                                              |
| `pnpm lint`                         | ✅     | 0 errors. 15 warnings in `@baydar/api` (import/order — `--fix`able). |
| `pnpm type-check`                   | ✅     | Background run, exit 0.                                              |
| `pnpm test`                         | ✅     | Root + mobile suites both green.                                     |
| `pnpm --filter @baydar/db generate` | ✅     | Prisma client v5.22.0 generated in 415ms.                            |

## Phase 1 cache evidence

Captured after composite action + `--cache` flags landed:

- First `pnpm lint` (after switch): all 8 tasks executed, ~16.4s.
- Second `pnpm lint` (no source change): `Tasks: 8 successful, Cached: 7 cached, Time: 2.46s`.
- Turbo's "no output files" warnings cleared for `ui-tokens` and `web` once
  `--cache --cache-location node_modules/.cache/eslint/` was applied (`web`
  reverted — `next lint` does not accept `--cache` and caches internally).

Cache hit ratio target post-Phase-1: ≥ 80% on consecutive CI runs.

## Open metrics to capture next session

These are recorded here as a placeholder so Phase 3+ have a delta to compare
against. Capture on the **first commit of Phase 3** before any DB changes
land.

- **Web bundle** — `pnpm --filter @baydar/web build`, capture the
  per-route gzipped sizes from the `Route (app)` table.
- **Lighthouse** — `pnpm --filter @baydar/web lhci`, record perf/a11y/best
  practices/SEO scores for `/ar-PS/feed`, `/ar-PS/jobs`, `/ar-PS`.
- **API load test** — `pnpm load:api:baseline`, capture median + p95 + p99
  for: feed list, messaging rooms list, notifications list, search/people.
- **Test wall-time** — `time pnpm test` per package.

## Repo health snapshot

- Open issues: [#4](https://github.com/osama-2000236/palnet/issues/4) (EAS),
  [#5](https://github.com/osama-2000236/palnet/issues/5) (Render blueprint —
  **filed in this PR**), [#6](https://github.com/osama-2000236/palnet/issues/6)
  (Vercel blueprint — **filed in this PR**), [#7](https://github.com/osama-2000236/palnet/issues/7)
  (FTS migration), [#8](https://github.com/osama-2000236/palnet/issues/8)
  (Maestro), [#9](https://github.com/osama-2000236/palnet/issues/9)
  (moderation e2e).
- Latest Deploy run on `main`: **failed** — Vercel + Neon secrets unset.
  Phase 2 (this PR) downgrades that to a warning-with-skip.
- Workspace size (source only, excludes `node_modules`):

  ```text
  18K   packages/config
  26K   packages/ui-tokens
  113K  packages/shared
  145K  packages/db
  192K  packages/ui-web
  264K  packages/ui-native
  657K  apps/web
  830K  apps/api
  980K  apps/mobile
  ```

  Lockfile: `pnpm-lock.yaml` ≈ 21.7k lines.
