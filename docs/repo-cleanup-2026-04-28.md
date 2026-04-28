# Repo Cleanup — 2026-04-28

## Intent

Bring `main` back to a clean, current-state Baydar baseline:

- docs describe the verified Sprint 11.5 `main` state;
- generated agent/run artifacts are removed;
- unrelated root documents are removed;
- all non-main branches and remote branch refs are deleted after the docs commit is pushed.

## Deleted Artifacts

Planned local removals:

- `.codex-run/`
- `.codex-logs/`
- `.claude/worktrees/`
- `Layer2_STP_DHCP_Security_Report_Osama_Abu_Jarad.docx`
- `~$yer2_STP_DHCP_Security_Report_Osama_Abu_Jarad.docx` if present

These are not Baydar source files.

## Branches Marked For Deletion

Local:

- `claude/determined-bose-df0682`
- `claude/musing-satoshi-5f94df`
- `claude/objective-brahmagupta-9907e1`
- `claude/recursing-banzai-6f9e51`
- `claude/sad-elion-38b245`
- `claude/suspicious-sammet-c607c8`
- `claude/trusting-wing-b23a6e`
- `codex/final_plan`

Remote:

- `origin/claude/musing-satoshi-5f94df`
- `origin/codex/final_plan`

Branch heads recorded before deletion:

- `claude/*` worktree branches: `0b9ee19` except `claude/musing-satoshi-5f94df` at `6cc48c0`.
- local `codex/final_plan`: `85cc085 docs: align repo state and cleanup records` (accidental local docs commit, reapplied to `main` before deletion).
- remote `origin/codex/final_plan`: `f2e8367 ci(e2e): seed database before Playwright run`.

The deletion of unmerged `codex/final_plan` work is intentional per user instruction.

## Verification Commands

```powershell
pnpm install --frozen-lockfile
pnpm lint:tokens
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm --filter @baydar/db generate
git status --short
git branch --all --verbose
git worktree list
```

## Known Warnings

- `pnpm install --frozen-lockfile` may emit Node's `DEP0169` warning from a transitive dependency.
- `pnpm lint` may emit non-fatal API import-order warnings while still exiting successfully.
