# OPUS5 Phase 0 — repo hygiene ledger (2026-07-25)

Charter: [OPUS5-VISION-REVIEW-PROMPT.md](./OPUS5-VISION-REVIEW-PROMPT.md) §5.
Branch: `review/opus5-launch-readiness`, cut from `origin/main` @ `c72e9d6`.

## Before

```
$ git worktree list
C:/LinkedIn                                             857ff96 [main]
C:/b                                                    3da7e8b (detached HEAD)
C:/LinkedIn/.claude/worktrees/blissful-austin-7e6f55    c72e9d6 [claude/baydar-full-repo-audit-9f3c7e]
C:/LinkedIn/.claude/worktrees/epic-wiles-84cc6b         e100ce0 (detached HEAD)
C:/LinkedIn/.claude/worktrees/exciting-einstein-05cf0b  6867058 (detached HEAD)
C:/LinkedIn/.claude/worktrees/zealous-bassi-ff4cee      3441dba (detached HEAD)

$ git branch -vv
+ claude/baydar-full-repo-audit-9f3c7e             c72e9d6 (worktree) ponytail audit 6 (#92)
  claude/design-ce0850                             71f47f5 fix(security): harden auth… (#84)
  claude/design-hierarchy-2026-07-23               23a4edf [origin: gone]
  claude/design-polish-2026-07-23                  3441dba [origin: gone]
  claude/ponytail-ultra-d41592                     c42a20e [origin/claude/ponytail-ultra-d41592]
  claude/screenshot-evidence-systemic-fixes-d07eb2 e100ce0 [origin: gone]
  claude/vision-design-2026-07-23                  c3f2b4f [origin: gone]
* main                                             857ff96 [origin/main: behind 1]

$ git stash list
stash@{0}: On fix/security-messaging-hardening: wip-unrelated-outside-security-pr
stash@{1}: On claude/amazing-swanson-8e9f62: codex-preserve pre-23b tracked dirty work
```

`.git` was 58M. `main` was one commit behind `origin/main` (#92 had landed on the remote).

## Safety net

Every branch tip and both stash commits were tagged before deletion, so the whole purge is
reversible and survives `git gc`: `backup/claude-*`, `backup/stash-0`, `backup/stash-1`
(`git tag -l 'backup/*'`). Delete these tags once the review lands.

## Branch dispositions

Merge status confirmed against `gh pr list --state all` — every branch below maps to a MERGED PR,
and content was verified with `git diff origin/main <branch>` rather than SHA reachability
(all were squash-merged, so their commits are absent from `main` by SHA while their content is not).

| Branch                                             | Tip       | Disposition | Reason                                                                                                                                                                                                                                             |
| -------------------------------------------------- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claude/ponytail-ultra-d41592`                     | `c42a20e` | deleted     | PR #92 merged; tree diff vs `origin/main` is **empty**                                                                                                                                                                                             |
| `claude/screenshot-evidence-systemic-fixes-d07eb2` | `e100ce0` | deleted     | PR #91 merged                                                                                                                                                                                                                                      |
| `claude/design-polish-2026-07-23`                  | `3441dba` | deleted     | PR #90 merged                                                                                                                                                                                                                                      |
| `claude/design-hierarchy-2026-07-23`               | `23a4edf` | deleted     | PR #89 merged                                                                                                                                                                                                                                      |
| `claude/vision-design-2026-07-23`                  | `c3f2b4f` | deleted     | PR #88 merged                                                                                                                                                                                                                                      |
| `claude/baydar-full-repo-audit-9f3c7e`             | `c72e9d6` | deleted     | equal to `origin/main`; was this session's scratch branch                                                                                                                                                                                          |
| `claude/design-ce0850`                             | `71f47f5` | **kept**    | standing instruction marks it the live branch, never to be cleaned up. Its tip is PR #84's merge commit, already in `main`, so keeping it costs nothing. Charter §5.3 listed it for deletion; resolved per charter §1 (record the call, continue). |

`main` fast-forwarded `857ff96 → c72e9d6`.

## Stash dispositions

**`stash@{0}`** — "wip-unrelated-outside-security-pr", off `fix/security-messaging-hardening` (#84).
7 files: `apps/api/package.json` (drop `source-map-support`, `ts-loader`, `tsconfig-paths`),
`apps/mobile/src/components/rows/PostRow.tsx` (delete the repost + send actions),
`apps/mobile/src/lib/locale.ts`, `apps/web/.../saved/page.tsx`,
`packages/ui-native/src/SegmentedControl.tsx`, `pnpm-lock.yaml`.
Partly salvaged, then dropped. The PostRow half is dead and actively wrong — PR #91 shipped a
_working_ repost, so re-applying the stash would delete a shipped feature. The three unused API
devDependencies were still present in `apps/api/package.json` and are genuinely unreferenced
(`nest-cli.json` uses the default tsc builder, not webpack; `jest.config.js` uses `ts-jest` +
`moduleNameMapper`, not `tsconfig-paths`), so that cut was salvaged as its own commit.

**`stash@{1}`** — "codex-preserve pre-23b tracked dirty work", off `claude/amazing-swanson-8e9f62`
(branch no longer exists). 95 files, +1121/-589, predating #84. Dropped unsalvaged: it does not
reverse-apply against `main`, and every area it touches (`ui-native/index.ts`, safety snapshots,
mobile onboarding/feed/messages, API auth + profiles + account) has been rewritten across PRs
#84–#92. Applying it would clobber eight merged PRs. Preserved as `backup/stash-1`.

## Worktrees

`git worktree remove --force` deregistered all four stale registrations but could not delete the
directories (`Filename too long` — MAX_PATH against nested `node_modules`). Removed from disk with
`Remove-Item -LiteralPath "\\?\<path>" -Recurse -Force`, which bypasses MAX_PATH.

Deleted, 11 directories: `C:\b`, plus `.claude/worktrees/{adoring-aryabhata-a4b065,
beautiful-swirles-8f7645, epic-wiles-84cc6b, exciting-einstein-05cf0b, gracious-montalcini-8b2872,
practical-lehmann-f6f567, priceless-driscoll-22ccaa, sad-euler-f8602d, unruffled-hofstadter-f13834,
zealous-bassi-ff4cee}`.

`blissful-austin-7e6f55` was on the charter's removal list but is the live session's working
directory — removing it would end the run. Kept, and re-pointed from the scratch branch to
`review/opus5-launch-readiness`.

Deleting `C:\b` removes the short-path worktree used to work around MAX_PATH/CMake limits in local
Android builds. The workaround is "use a short worktree path", not that directory specifically —
recreate with `git worktree add C:\b` when next building the mobile dev client.

## Files

| File                               | Disposition            | Reason                                                                                                                                                                                         |
| ---------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/settings.json`            | committed              | project-scope plugin config (`frontend-design`); `.gitignore` already excludes the personal `settings.local.json`                                                                              |
| `OPUS5-VISION-REVIEW-PROMPT.md`    | moved to `docs/audit/` | this run's charter — belongs with the deliverables it governs, not at repo root                                                                                                                |
| `tools/CLAUDE-OPENROUTER-SETUP.md` | gitignored             | documents `tools/claude-code-router`, which is itself gitignored; per-machine tooling, unrelated to the product                                                                                |
| `apps/web/e2e/shots.mjs`           | fixed                  | `OUT_DIR` defaulted to an absolute temp path inside `zealous-bassi-ff4cee` — a worktree deleted above. Now `apps/web/.qa-shots`, repo-relative and gitignored, overridable via `QA_SHOTS_OUT`. |

Build/debug artifacts deleted from disk (all already gitignored, so no `.gitignore` change needed):
`apps/web/{debug.log, web.log, test-results/, coverage/, tsconfig.tsbuildinfo}`,
`apps/mobile/{coverage/, dist/, tsconfig.tsbuildinfo}`,
`apps/api/{coverage/, baydar-api-qa.log, baydar-api-qa.err.log}`.

## Charter claims corrected

- **Line-ending drift on the legal pages does not exist.** `(public)/legal/terms/page.tsx` and
  `(public)/legal/tos/page.tsx` share one index blob, `b61fc4d`, and `.gitattributes` already
  carries `* text=auto eol=lf`, which covers `*.tsx`. The CRLF on `tos/page.tsx` is a stale
  working-tree artifact in the main checkout only. Nothing to normalize. The real defect is that the
  two files are the same file — `/legal/terms` renders `kind="tos"` — which is a Phase 3g finding,
  not a Phase 0 one.
- **`main` was behind `origin/main`, not level with it.** #92 had already merged remotely.
- Untracked files were three, not two: `OPUS5-VISION-REVIEW-PROMPT.md` was not in the charter's list.
- Two stray API log files (`baydar-api-qa.log`, `baydar-api-qa.err.log`) were not in the charter's
  artifact list. Both were already gitignored.

## After

```
$ git worktree list
C:/LinkedIn                                           c72e9d6 [main]
C:/LinkedIn/.claude/worktrees/blissful-austin-7e6f55  c72e9d6 [review/opus5-launch-readiness]

$ git branch -vv
  claude/design-ce0850          71f47f5 fix(security): harden auth… (#84)
* main                          c72e9d6 [origin/main] ponytail audit 6 (#92)
+ review/opus5-launch-readiness c72e9d6 (worktree) [origin/main] ponytail audit 6 (#92)

$ git stash list
(empty)
```

`.git` 58M → 11M after `git gc --prune=now`.

## Gate 0

Zero merge-conflict markers in tracked files (`git grep -E '^(<<<<<<< |=======$|>>>>>>> )'`).
`pnpm install` refreshed the lockfile for the devDependency cut only — 32 deletions, all
`source-map-support` / `ts-loader` / `tsconfig-paths` and the transitive `source-map`.

| Gate                              | Exit                                           |
| --------------------------------- | ---------------------------------------------- |
| `pnpm lint`                       | 0                                              |
| `pnpm format:check`               | 0                                              |
| `pnpm lint:tokens`                | 0                                              |
| `pnpm qa:design`                  | 0 (11 legacy over-300-LOC warnings, unchanged) |
| `pnpm check:release-placeholders` | 0                                              |
| `pnpm type-check`                 | 0                                              |
