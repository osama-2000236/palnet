# Empty states — Claude Design Pass 1, deliverable 1 of 3

Scope from [`design-handoff-2026-05/10-ask.md`](../../design-handoff-2026-05/10-ask.md) §1. This directory contains the markdown deliverables; the implementation lives in the repo proper.

## Files

| File                                           | Purpose                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`style-direction.md`](style-direction.md)     | Illustration style stance, recipe, list of the eight motifs, acceptance rules.              |
| [`token-diff.md`](token-diff.md)               | Tokens added (`illustration.size`, `illustration.stroke`) — TS, CSS, native.                |
| [`component-changes.md`](component-changes.md) | `EmptyState` component spec (web + native), illustration kit, screen call sites, i18n keys. |
| [`rationale.md`](rationale.md)                 | Why a new primitive, why these motifs, what was rejected.                                   |

## Code (the mock)

Per the agreed mock format ("code-first + screenshots"), the canonical mocks are the implemented call sites. Open them in a running dev server (or capture via `scripts/capture-snapshots.mjs` from `design-handoff-2026-05/handoff-plan.md` T-B.6) to see the result.

Component:

- [`packages/ui-web/src/EmptyState.tsx`](../../packages/ui-web/src/EmptyState.tsx)
- [`packages/ui-native/src/EmptyState.tsx`](../../packages/ui-native/src/EmptyState.tsx)

Illustrations:

- [`packages/ui-web/src/illustrations.tsx`](../../packages/ui-web/src/illustrations.tsx)
- [`packages/ui-native/src/illustrations.tsx`](../../packages/ui-native/src/illustrations.tsx)

Screen wiring is enumerated in [`component-changes.md`](component-changes.md).

## Verification done

- `pnpm lint:tokens` — clean for this PR (1 pre-existing hit on `apps/web/src/app/[locale]/(auth)/login/page.tsx:8` unrelated to empty states).
- `pnpm --filter @baydar/ui-web type-check` — exit 0.
- `pnpm --filter @baydar/ui-native type-check` — exit 0.
- `pnpm --filter @baydar/web type-check` — exit 0.
- `pnpm --filter @baydar/mobile type-check` — exit 0.

## Verification deferred to reviewer

- Visual screenshot capture (10 routes × 3 viewports × 2 locales) via `scripts/capture-snapshots.mjs` with seeded auth fixture — requires local dev servers + DB.
- `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts` — same dependency.

## Pass status

Pass 1 / 3:

- [x] R1 Empty states — this directory.
- [ ] R2 Surface hierarchy audit + redesign.
- [ ] R3 Onboarding flow + shell decision.

R2 and R3 ship in separate PRs per the plan.
