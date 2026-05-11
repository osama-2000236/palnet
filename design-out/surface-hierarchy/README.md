# Surface hierarchy — Claude Design Pass 1, deliverable 2 of 3

Scope from [`design-handoff-2026-05/10-ask.md`](../../design-handoff-2026-05/10-ask.md) §2. The audit work and the per-screen recipe doc are the deliverables; targeted code refactors land in the same PR.

## Files

| File | Purpose |
| --- | --- |
| [`audit.md`](audit.md) | Per-screen surface map before/after, with the "every-card" hits called out. |
| [`rail-policy.md`](rail-policy.md) | When a screen gets a right rail and what goes in it. |
| [`rationale.md`](rationale.md) | Why these refactors, what was rejected. |

The promoted recipe doc lives in the main tree, not here:

- [`docs/design/SCREENS.md`](../../docs/design/SCREENS.md) — the new per-screen recipe doc (was a stub).

## Code (the mock)

Refactors applied this pass:

- [`apps/web/src/app/[locale]/(app)/network/page.tsx`](../../apps/web/src/app/[locale]/(app)/network/page.tsx) — list wrapped in one `flat` `Surface`; each row is a `row`-variant Surface. Was: one `flat` Surface *per row*.
- [`apps/web/src/app/[locale]/(app)/jobs/page.tsx`](../../apps/web/src/app/[locale]/(app)/jobs/page.tsx) — same fix. `JobListRow` now renders `variant="row"`. Skeleton matches.

Mobile FlatList lists already use `RecordCard` items without the per-row card antipattern, so no mobile refactor was required.

Feed and messages screens were audited and kept as-is — they already use the recipe in [`SCREENS.md`](../../docs/design/SCREENS.md).

## Verification

- `pnpm lint:tokens` — clean for this PR (same single pre-existing hit as Pass 1).
- `pnpm --filter @baydar/web type-check` — exit 0.
- `pnpm --filter @baydar/ui-web type-check` — exit 0.

## Pass status

Pass 1 / 3:

- [x] R1 Empty states ([PR #18](https://github.com/osama-2000236/palnet/pull/18)).
- [x] R2 Surface hierarchy — this directory + `SCREENS.md` promotion + network/jobs refactor.
- [ ] R3 Onboarding flow + shell decision.
