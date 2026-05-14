# Surface audit — top 4 screens

Findings from walking the shipped web screens against the `DESIGN.md §5.6` recipe.

## Feed — `apps/web/src/app/[locale]/(app)/feed/page.tsx`

**Before:**

| Block             | Surface                   |
| ----------------- | ------------------------- |
| Left mini-profile | `hero`                    |
| Composer          | inline tinted pill        |
| Posts list        | bare list of `card` posts |
| Right PYMK        | `card`                    |
| Right Jobs        | `card`                    |

**Verdict:** correct. The eye sees: one hero up top (you), a column of distinct content cards in the middle (posts), and a rail of secondary cards on the side (discovery). No nesting, no flat-spam.

**Action:** none. Documented in [`docs/design/SCREENS.md`](../../docs/design/SCREENS.md).

## Network — `apps/web/src/app/[locale]/(app)/network/page.tsx`

**Before:**

| Block               | Surface                                  |
| ------------------- | ---------------------------------------- |
| H1 + filter tabs    | bare                                     |
| Each connection row | individual `flat` Surface with padding 4 |
| List separator      | 12px gap                                 |

**Anti-pattern:** every row is its own bordered container. The eye reads ten bounded units instead of one list. Skeleton already used this same pattern, reinforcing the drift.

**After:**

| Block            | Surface                                  |
| ---------------- | ---------------------------------------- |
| H1 + filter tabs | bare                                     |
| List wrapper     | one `flat` `Surface` `as="section"`      |
| Each row         | `row`-variant Surface, `last:border-b-0` |

**Result:** one outlined list, internal hairlines between rows. The eye reads "one list of N people," and the action buttons inside each row no longer compete with the row's own border.

**File touched:** [`apps/web/src/app/[locale]/(app)/network/page.tsx`](<../../apps/web/src/app/[locale]/(app)/network/page.tsx>).

## Jobs — `apps/web/src/app/[locale]/(app)/jobs/page.tsx`

**Before:**

| Block                       | Surface                                      |
| --------------------------- | -------------------------------------------- |
| Left filters                | `card` with `<fieldset>` blocks              |
| Each job row (`JobListRow`) | `card` with shadow, separated by `space-y-3` |
| Empty                       | `EmptyState` (after Pass 1)                  |
| Skeleton                    | `card` (matched the row pattern)             |

**Anti-pattern:** same as Network — every row is its own shadowed card. Combined with the left-rail card, the page has 1 + N cards floating in a single result column.

**After:**

| Block        | Surface                                             |
| ------------ | --------------------------------------------------- |
| Left filters | `card` (unchanged)                                  |
| List wrapper | one `flat` `Surface` `as="section"`                 |
| Each row     | `row`-variant Surface (hover → `bg-surface-subtle`) |
| Skeleton     | `row` variant (matches)                             |

**Result:** the filter card on the left, the result list on the right. Two surfaces, not eleven. The filter card still earns its shadow because it sits visually higher in the column hierarchy (controls the page).

**File touched:** [`apps/web/src/app/[locale]/(app)/jobs/page.tsx`](<../../apps/web/src/app/[locale]/(app)/jobs/page.tsx>).

## Messages — `apps/web/src/app/[locale]/(app)/messages/page.tsx`

**Before:**

| Block           | Surface                                        |
| --------------- | ---------------------------------------------- | ---- |
| Outer container | `card` with grid `320                          | 1fr` |
| Room list pane  | bare flex column, `RoomRow` items as bare rows |
| Thread pane     | bare, `surface-subtle` bg for the body         |
| Composer        | bordered row at the bottom                     |

**Verdict:** correct. The whole screen is one `card`; everything inside is `row`s and `flat` surfaces. No nesting. The Pass 1 empty-state work already replaced the inline "No active room" CTA with a proper `EmptyState`.

**Action:** none.

## Other screens audited (not in the top 4 but visited)

- **Notifications**: rows use inline tinted-bg styling per unread state. Not a Surface variant, but justified by the read/unread visual contrast. No change.
- **Search**: results render as bare rows under a tabbed segmented control. No `card` repetition. No change.
- **Profile (own/other)**: hero header + section `flat` blocks. Correct.
- **Settings/blocked**: one outer `flat` Surface holding `BlockedListItem` rows. Correct (Pass 1 already added the `EmptyState` for the zero case).

## Side findings worth a separate fix

These came up during the audit and should land in their own PRs:

1. The filter tab strip in Network is a hand-rolled `<button>` group. The `Tabs` primitive in `@baydar/ui-web` would unify the strip with the rest of the app's segmented controls. Defer until at least one more screen reuses this pattern, per the "3+ screens before promotion" rule.
2. `JobRowSkeleton` borrowed the old `card` variant; the refactor changed it to `row` so the loading state matches the loaded state. If we add a `RowSkeleton` primitive later, fold this in.
