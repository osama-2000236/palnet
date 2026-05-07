# Baydar Design Handoff — May 2026

Bundle for Claude Design pass. All paths relative to this dir.

## Read order

1. `01-brand/BRAND.md` — what Baydar is, voice, anti-patterns.
2. `02-system/DESIGN.md` — visual system, non-negotiables.
3. `02-system/RTL.md` + `MOBILE.md` + `NAV.md` — constraints.
4. `02-system/tokens.{ts,css,native.ts}` — token source of truth.
5. `03-components/` — shipped component specs + source.
6. `04-screens/{screen}/web,mobile/` — per-screen source + snapshots.
7. `05-prototype/Baydar Prototype.html` — visual ground truth.
8. `06-fixtures/content.json` — realistic Arabic content for testing.
9. `07-audits/` — token drift, parity, a11y baseline.
10. `08-pain.md` + `08-problems.md` — what hurts today.
11. `09-moodboard/` — competitive references (anti-LinkedIn).
12. `10-ask.md` — explicit deliverable.

## Hard constraints (do not violate)

- Olive primary `#526030`, terracotta accent `#a8482c`. **Never blue.**
- RTL first. Logical CSS only. See `02-system/RTL.md`.
- Tokens are the only source of values.
- Arabic-first copy.
- Five surface variants — use intentionally, never nest cards.
- 44pt mobile / 40px web minimum hit target.
- Visible focus ring: 2px `--brand-600`, 2px offset.
- No dark mode (not yet designed).
- No emoji in product chrome (UGC only).
- No decorative gradients except profile cover.

## Bundle status

See `STATUS.md` for per-task completion + gaps.

## Build context

- Branch: `claude/eloquent-yonath-6c4db3`
- Last commit at bundle generation: `78b97a2 feat(api,web,mobile,ui): Sprint 21 — UI polish bundle`
- Date: 2026-05-07
