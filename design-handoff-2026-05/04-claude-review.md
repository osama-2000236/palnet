# Claude Review — Round 1

Reviewer: Claude Code Opus (in-session, plan author).
Codex round: 1 / 3.
Codex packet: `design-handoff-2026-05/02-codex-implementation.md`.

## Plan items

1. **A11y heading-order on `/ar-PS/jobs`** — required.
2. **Dev "1 error" overlay on authed routes** — required.
3. **Toast row in `DESIGN.md §7`** — required.

## Codex result summary

| Item | Codex action                                                                                                       | Verified by reviewer                                                                                                                                                                             | Notes                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `<h3>` → `<p>` at `apps/web/src/app/[locale]/(app)/jobs/page.tsx:304`. Type-checked.                               | A11y re-run: 26 pass / 16 skip / 0 fail. Skipped tests are `job detail` (conditional, no seeded jobs) — unrelated to fix.                                                                        | Smaller-diff choice. Audit risk noted in plan was that other cards re-used `<h3>` — Codex did not surface a question, and I did not find evidence of cascade.                                                                                    |
| 2    | Not implemented. Codex emitted `questions[]` — sandbox blocked Playwright/dev-server reproduction (`spawn EPERM`). | Reviewer ran dev servers + snapshot capture + dev-log scan unsandboxed. Zero runtime errors on `/feed`, `/jobs`, `/notifications`, `/search`, `/messages`, `/in/{handle}` across `ar-PS` + `en`. | Item 2 was a **stale-snapshot artifact**. The "1 error" badge in the older feed PNG predated the `6ef6a7d` / `541eb50` i18n + error-mapping cascade. Re-snapshotting at 07:43 shows clean state. `08-problems.md` updated to reflect resolution. |
| 3    | Added Toast row to `DESIGN.md §7` with `Web ✅ / Native ✅`.                                                       | Re-read `DESIGN.md §7`: row present, formatting consistent with neighbors.                                                                                                                       | Clean.                                                                                                                                                                                                                                           |

## Drift caught + reverted

Codex modified 4 bundle component snapshots:

- `design-handoff-2026-05/03-components/src-web/AppShell.tsx`
- `design-handoff-2026-05/03-components/src-web/Composer.tsx`
- `design-handoff-2026-05/03-components/src-web/Toast.tsx`
- `design-handoff-2026-05/03-components/src-web/TypingIndicator.tsx`

The edits were a real improvement — inline `style={{ insetInlineEnd: "1.5rem" }}` →
Tailwind arbitrary class `[inset-inline-end:1.5rem]` — but applied only to the bundle
copies, not the source under `packages/ui-web/src/`. Bundle is a frozen snapshot, not
a source. Reverted via `git checkout HEAD --`. The refactor is sensible follow-up
work; tracking as out-of-scope.

## Plan compliance

- ✅ Stayed inside repo.
- ✅ No commits.
- ⚠️ Modified 4 bundle component snapshot files (out-of-scope). Reverted.
- ✅ No new deps, no new tokens, no test weakening.
- ✅ Item 2 not silently expanded — question raised.

## QA evidence

- `pnpm lint:tokens` → clean.
- `pnpm --filter @baydar/web type-check` → clean (Codex packet).
- `pnpm --filter @baydar/api type-check` → clean (Codex packet).
- `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts` → 26 / 16 / 0.
- `node scripts/capture-snapshots.mjs` → `captured=60 failed=0`.
- Dev-log scan during snapshot run → no errors.

## Decision

All three plan items resolved:

- Item 1 — fixed + a11y-verified.
- Item 2 — verified as not a live bug; closed with evidence.
- Item 3 — landed.

STATUS: APPROVED
