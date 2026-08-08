# Baydar — Codex Agent Context

## Stack

Turborepo 2 · pnpm 9.12.0 · Next.js 16 App Router (Turbopack) · Expo SDK 54 · NestJS 11 · Prisma 6

- UI tokens: packages/ui-tokens (tokens.css + tailwind-preset.ts)
- Web atoms: packages/ui-web (@baydar/ui-web barrel via index.ts)
- Web app: apps/web (Next.js 16, locale-aware App Router)
- Mobile app: apps/mobile (Expo, parity with web minus admin/legal)

## Critical conventions

1. Every CSS variable must come from @baydar/ui-tokens/tokens.css.
   Never hard-code hex values. Never redeclare tokens in globals.css.
2. All atoms live in packages/ui-web/src/. Add them to the barrel (index.ts).
3. File size limit: 300 LOC per page/component. Split above that threshold.
4. RTL-first: use logical CSS properties (start/end, not left/right).
   Numerals inside Arabic text require dir="ltr" wrapping.
5. Every interactive element needs a focus-visible outline using
   box-shadow: var(--focus-ring). Never outline: none alone.
6. Session end: run `pnpm typecheck && pnpm lint` from repo root.
   Both must pass before committing.
7. Commit format: `feat(scope): description` or `fix(scope): description`
   Wait for `gh pr status` after pushing.

## Design handoff location

The May 2026 design-review source tree merged into the repo on 2026-06-04 and
moved to `docs/_archive/design-handoff-2026-05/` on 2026-08-08. It holds only
the Pass 2 gate docs (`10-ask.md`, `08-pain.md`, `08-problems.md`) plus frozen
status — every snapshot of a repo file was deleted; read the live source
instead (see that dir's `00-README.md`).

**`10-ask.md` is archived but not closed.** The Pass 2 ask still awaits lead
approval, and engineering does not implement its output before that. It is
tracked live in `docs/HANDOFF.md`; the archive is where the reasoning lives,
not a statement that the question was answered.

Current parity ledger and design docs: `design-handoff-2026-06/README.md`.

## Atom architecture

New atoms follow the existing pattern in packages/ui-web/src/:

- Props interface exported alongside the component
- forwardRef where the element has a DOM ref
- cx() from ./cx for class merging (never clsx, never cn)
- No inline styles — Tailwind utilities + CSS vars only
- Variants encoded as lookup objects (see Alert.tsx, Chip.tsx, Input.tsx)

## Test expectations

- `pnpm build` from repo root must succeed with zero type errors
- ESLint must pass with zero errors (warnings allowed)
- No new `any` types introduced
