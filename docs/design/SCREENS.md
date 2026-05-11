# Screen recipes

Per-screen composition rules: which `Surface` variant goes where, which rail (if any) belongs on the right column, which states the screen owes the user. Promoted from stub in Design Pass 1 R2.

> `DESIGN.md` remains the source of truth for *visual* decisions. This file is the source of truth for *composition* decisions per screen. When the two disagree, `DESIGN.md` wins — and open a PR to bring this file into line.

## Vocabulary

The five surface variants, from `DESIGN.md` §5.6:

- **`flat`** — list containers, sidebar groupings. Border only, no shadow.
- **`card`** — feed posts, main content blocks. Border + soft shadow.
- **`hero`** — profile header, mini-profile rail. Border + shadow, radius xl.
- **`tinted`** — inputs, own-message bubbles, empty states. Tint bg, no border.
- **`row`** — list items inside a `flat` container. Transparent bg, bottom border.

Rule: **never nest `card` inside `card`**. A list of records is one `flat` container with `row` items, not a stack of free-floating `card`s.

## Right-rail policy

A right rail is justified only when the screen has *secondary discovery* — content the user might pivot to without leaving the verb of the page.

| Screen | Right rail? | What goes in it |
| --- | --- | --- |
| Feed | **yes — 2 rails** | Left: mini-profile hero + connections snapshot. Right: PYMK + suggested jobs. |
| Network | no | Left filters justify themselves; the page *is* discovery. A right rail would compete. |
| Jobs | no | Left filters do the work. Right is the result. Don't fight the result column. |
| Messages | no | Focus screen. Room list is the only secondary surface. |
| Notifications | no | Read-once stream. |
| Search | no | Filters are inline tabs; results are the page. |
| Profile (own and others) | no | Hero + tabs do the work. |
| Settings | no | Sub-routes do the work. |
| Onboarding | no | Bare shell, one verb. See §11.1 in `DESIGN.md`. |

Mobile has no right rails — single column. The mobile divergence is documented per-screen below.

## Feed — `apps/web/src/app/[locale]/(app)/feed/page.tsx`

**Web layout**: 3-column grid `225 | 1fr | 300`, gap 24, max 1128.

**Surfaces:**

- Left rail: single `hero` (mini-profile + cover gradient + quick links). Padding 0.
- Middle: bare list of `card` posts (`PostCard` already renders `card`). No outer wrapper.
- Composer: `tinted` collapsed pill.
- Right rail: two `card` blocks (PYMK + suggested jobs). Padding 0.

**States:**

- Loading: 3× `PostCardSkeleton`.
- Empty: `EmptyState` with `WheatSheaf`, no action (composer is one click above).
- Error: `tinted` retry banner.

**Mobile**: same posts as bare cards. No rails. Composer entry as a row above the feed.

## Network — `apps/web/src/app/[locale]/(app)/network/page.tsx`

**Web layout**: 2-column grid `220 | 1fr`, max 840.

**Surfaces:**

- Top: `h1` + filter tab strip (custom buttons; will move to shared `Tabs` when the segmented control gets adopted).
- List: one outer `flat` `<Surface>` containing `<li>` rows with `variant="row"` and `last:border-b-0`. **Do not give each row its own `card`** — that's the anti-pattern this pass fixed.

**States:**

- Loading: 3× `ConnectionRowSkeleton` directly (no wrapper).
- Empty: `EmptyState` with `DoorArch`. Action `Discover people → /search` on the ACCEPTED filter; no action on INCOMING / OUTGOING.

**Mobile**: `FlatList` of `ConnectionRow` cards. Header has filter buttons + count.

## Jobs — `apps/web/src/app/[locale]/(app)/jobs/page.tsx`

**Web layout**: 2-column grid `260 | 1fr`, max 1128.

**Surfaces:**

- Left filters: single `card` `<aside>` with `<label>` blocks + `FilterChip` rows.
- Right list: one outer `flat` `<Surface>` containing `<li>` rows; each row is a `row`-variant `Surface` rendered by `JobListRow`. Hover sets `bg-surface-subtle`. **No per-row card.**
- Empty: `EmptyState` with `BriefcaseTied`. Action `Clear filters` when any filter is active.

**States:**

- Loading: 3× `JobRowSkeleton` (still as bare rows; transient).
- Error: `tinted` banner.

**Mobile**: same vertical list, FlatList renders `RecordCard` items.

## Messages — `apps/web/src/app/[locale]/(app)/messages/page.tsx`

**Web layout**: single column max 1128, inside one outer `card` `<Surface>` that owns both panes.

**Surfaces:**

- Outer: `card`, padding 0, grid `320 | minmax(0, 1fr)`.
- Left pane: `RoomRow` items in a `row` strip.
- Right pane: thread inside the same `card`. Tinted `surface-subtle` thread bg.
- Composer: input + send button along the bottom border of the right pane.

**States:**

- No-room-selected: `EmptyState` with `EnvelopeFolded`, `Start new` action.
- Empty room list: `EmptyState` (compact density) with `EnvelopeFolded`, `New message` action.
- Empty thread (room open, zero messages): one-line text (`emptyThread`) — full empty-state would be too heavy inside an active conversation.

**Mobile**: room list and thread are separate routes (`/messages/index.tsx`, `/messages/[roomId].tsx`).

## Notifications — `apps/web/src/app/[locale]/(app)/notifications/page.tsx`

**Web layout**: single column, max 720.

**Surfaces:**

- `h1` header + optional `live` indicator.
- List: bare flex column of inline-styled rows (unread = `brand-50` bg, read = `surface` bg). This is one of the few places `Surface` is not used directly because the unread/read tint differs per row.
- Empty: `EmptyState` with `Lantern` (live region — `role=status`, `aria-live=polite`).

**Mobile**: `FlatList` of `RecordCard` items + same empty illustration.

## Search — `apps/web/src/app/[locale]/(app)/search/page.tsx`

**Web layout**: single column, max 840.

**Surfaces:**

- `h1` + search input + segmented tabs.
- Prompt state (before any typing): `flat` `Surface` with `t("prompt")`.
- Empty results state: `EmptyState` with `WinnowingTray`.
- Results: bare list of `PeopleRow` / `PostRow` / `JobsRow`.

**Mobile**: same — uses `SegmentedControl` from `@baydar/ui-native` for the type tabs.

## Profile — `apps/web/src/app/[locale]/(app)/in/[handle]/page.tsx`

**Web layout**: single column, max 880.

**Surfaces:**

- Hero header: `hero` Surface with cover gradient, avatar, name, headline, action buttons.
- Tabs: shared `Tabs` primitive (segmented underline).
- Each section (`About`, `Experience`, `Education`, `Skills`): individual `flat` `Surface` blocks.
- Activity tab: `flat` Surface with `h2` and `EmptyState` (compact density, `FieldRows`).

**Mobile**: own profile (`/me/index.tsx`) uses `SegmentedControl` and stacked sections.

## Settings — `apps/web/src/app/[locale]/(app)/settings/`

**Web layout**: single column, max 720 (hub) / 760 (sub-routes).

**Surfaces:**

- Hub: list of `flat` link rows.
- Account: `flat` sections (export / delete / restore) inside the page.
- Blocked: one outer `flat` Surface containing `BlockedListItem` rows. Empty: `EmptyState` (compact) with `LowWall`.

**Mobile**: same structure, single column.

## Auth & Onboarding

Bare shell (no `AppShell`). One verb per page. See `DESIGN.md` §11.1 for the shell decision.

R3 in `design-handoff-2026-05/10-ask.md` covers the multi-step onboarding flow and will land per-step recipes here in a separate PR.

## When to deviate

If a screen needs a sixth composition pattern, the answer is almost always one of:

1. Use `tinted` to mark a quiet inset block inside a `flat` container.
2. Use a wider gap between sections in the column.
3. Promote the block to a real component and document it in [`docs/components/`](../components/).

Do **not** invent a sixth `Surface` variant.
