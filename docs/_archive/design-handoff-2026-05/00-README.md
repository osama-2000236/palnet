# Baydar Design Handoff — May 2026 (superseded)

**The current handoff is `design-handoff-2026-06/`. Start there.**

What remains here is the part of the May bundle that is still _live input_ to an
open decision. Everything else was a point-in-time copy of a file that lives in
the repo, and copies of the design source of truth drift — they were removed in
favour of the originals. All paths below are relative to the repo root.

## What survives here, and why

| File                                                               | Why it's still here                                                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `08-pain.md`                                                       | v3 re-verification input — cited by `design-handoff-2026-06/README.md`.                                           |
| `08-problems.md`                                                   | Resolved/open split with code evidence — cited by `design-handoff-2026-06/README.md` and `docs/design/MOTION.md`. |
| `10-ask.md`                                                        | **Pass 2 ask — still awaiting lead approval.** Do not delete while that gate is open.                             |
| `09-moodboard/`                                                    | Competitive references (anti-LinkedIn). Not derived from the repo.                                                |
| `06-fixtures/content.json`                                         | Realistic Arabic test content. Not derived from the repo.                                                         |
| `STATUS.md`, `IMPLEMENTATION_COMPLETE.md`, `BUGS-PRECONDITIONS.md` | Frozen record of the May pass. History, not instructions.                                                         |

## Where the removed copies went

Read the live file, never a snapshot of it:

- Brand → `BRAND.md`
- Visual system → `DESIGN.md`
- RTL / mobile / nav / parity / screens → `docs/design/{RTL,MOBILE,NAV,PARITY,SCREENS}.md`
- Tokens → `packages/ui-tokens/src/{index.ts,tokens.css,tokens.native.ts}`
- Prototype (visual ground truth) → `docs/_archive/prototype-2025/Baydar Prototype.html`
- Component specs + per-screen source → the repo tree (`packages/ui-*/src`, `apps/*/`)
- Audit outputs → regenerate with `pnpm lint:tokens` and `pnpm qa:design`

## Build context (frozen)

- Branch: `claude/eloquent-yonath-6c4db3`
- Commit at bundle generation: `78b97a2 feat(api,web,mobile,ui): Sprint 21 — UI polish bundle`
- Date: 2026-05-07

The "hard constraints" list this file used to carry was a May-2026 snapshot and
had already gone stale (it said "no dark mode"; dark mode shipped). The current
constraints are in `CLAUDE.md`, `DESIGN.md`, and `docs/design/RTL.md`.
