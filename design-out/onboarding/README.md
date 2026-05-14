# Onboarding — Claude Design Pass 1, deliverable 3 of 3

Scope from [`design-handoff-2026-05/10-ask.md`](../../design-handoff-2026-05/10-ask.md) §3.

## Files

| File                                     | Purpose                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| [`flow.md`](flow.md)                     | The 5-step flow, per-step content direction, state-machine boundaries. |
| [`shell-decision.md`](shell-decision.md) | Bare shell vs `AppShell`. Decision and alternatives.                   |
| [`rationale.md`](rationale.md)           | Why a primitive, why three styles, what's deferred.                    |

The onboarding section in [`docs/design/SCREENS.md`](../../docs/design/SCREENS.md) covers per-step recipes and is the implementer-facing doc.

## Code (the primitive)

- [`packages/ui-web/src/OnboardingProgress.tsx`](../../packages/ui-web/src/OnboardingProgress.tsx)
- [`packages/ui-native/src/OnboardingProgress.tsx`](../../packages/ui-native/src/OnboardingProgress.tsx)

Same prop API on both platforms: `{ current, total, style?, labels?, locale?, className? }`. Three visual styles share one `role="progressbar"` contract: `bar` (default — filled track + Arabic-Indic tabular fraction), `dots`, `segmented`.

## What this PR does not do

- Migrate the web `/onboarding` route from single-step to multi-step. Tracked in the follow-up PR.
- Replace the inline progress strip in `apps/mobile/app/(app)/onboarding.tsx` with `OnboardingProgress`. Same follow-up.

Both are mechanical changes once the primitive and the per-step design are in. They are deferred to keep this PR reviewable.

## Verification

- `pnpm lint:tokens` — clean for this PR.
- `pnpm --filter @baydar/ui-web type-check` — exit 0.
- `pnpm --filter @baydar/ui-native type-check` — exit 0.

## Pass status

R1 (Empty states) shipped via [PR #23](https://github.com/osama-2000236/palnet/pull/23) with a parametric `EmptyState motif=` API. The `OnboardingProgress` primitive that #23 also shipped is the one referenced throughout this directory. R3 (this directory) layers the flow design and shell decision on top.
