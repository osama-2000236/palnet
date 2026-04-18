# DESIGN.md — Baydar design system source of truth

> Location in repo: **root** (same level as `CLAUDE.md`).
> This document governs every visual and interaction decision. When it conflicts with anything else, this wins.

## 1. What Baydar is

**Baydar** (بيدر) — the threshing floor, where farmers bring their harvest to be sorted and traded. It's our metaphor for a professional network: a shared ground where people bring what they've built, see and be seen, and trade.

- **Arabic-first, not Arabic-translated.** Every screen designed in RTL first.
- **Regional, not global-generic.** Olive, warm whites, serious restraint. Not Tailwind blue.
- **Professional, not corporate.** Editorial warmth over SaaS sterility.

## 2. The three non-negotiables

1. **Olive primary, terracotta accent.** No blue. Ever.
2. **Logical CSS properties only** (`start` / `end`, never `left` / `right`).
3. **Tokens are the only source of values.** No hardcoded colors, sizes, or spacing in components.

## 3. Visual language

### Color

| Role | Token | Value | Use |
|---|---|---|---|
| Brand primary | `--brand-600` | `#526030` | CTAs, active nav, logo |
| Brand dark | `--brand-700` | `#3f4a26` | Hover state on primary |
| Brand tint | `--brand-50` / `--brand-100` | `#f4f6ef` / `#e6ebd6` | Own-message bubbles, subtle highlights |
| Accent | `--accent-600` | `#a8482c` | Unread badges, notification dots, **at most one CTA per screen** |
| Ink | `--ink` | `#1a1a17` | Body text |
| Ink muted | `--ink-muted` | `#5c5a52` | Secondary text |
| Ink subtle | `--ink-subtle` | `#8a8880` | Captions, timestamps |
| Surface | `--surface` | `#ffffff` | Primary card bg |
| Surface muted | `--surface-muted` | `#faf9f5` | Page background |
| Surface subtle | `--surface-subtle` | `#f1efe7` | Input bg, hovered rows |
| Line soft | `rgba(26,26,23,0.08)` | — | Internal dividers |
| Line hard | `rgba(26,26,23,0.16)` | — | Input borders, outlined buttons |

**Forbidden:** pure `#000`, pure `#fff` shadows, Tailwind default blues/slates. Dark mode is not yet designed — do not add it.

### Typography

| Step | Size | Weight | Line | Use |
|---|---|---|---|---|
| `display` | 36 | 700 | 1.15 | Landing hero, empty states |
| `h1` | 26 | 600 | 1.25 | Page title |
| `h2` | 19 | 600 | 1.35 | Section header |
| `h3` | 16 | 600 | 1.40 | Card header, name in post |
| `body` | 15 | 400 | 1.60 | Post body, messages |
| `small` | 13 | 400 | 1.50 | Headline, meta |
| `caption` | 12 | 500 | 1.40 | Timestamps, counts |

**Families:**
- Headings & UI: **IBM Plex Sans Arabic** (+ Latin fallback)
- Body: **Noto Naskh Arabic** (+ Latin fallback)
- Numerals/code: **IBM Plex Mono**

Load fonts via `next/font/google` in `apps/web/app/layout.tsx`. Do not use `<link>` in production. On mobile, use `expo-font` with the same families bundled locally.

### Spacing scale

Linear scale in 4px units: `1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64`. Don't invent intermediate values.

### Radii

`xs=4, sm=6, md=10, lg=14, xl=20, full=9999`. Cards are `lg`, buttons `md`, pills `full`. Avatars always `full`.

### Shadows

Two only: `card` (quiet, resting elevation) and `pop` (modals, dropdowns). Don't invent more.

### Surfaces — DIFFERENTIATE, don't flatten

Five variants. Use them deliberately:

| Variant | Visual | When |
|---|---|---|
| `flat` | border only, no shadow | List containers, sidebar cards |
| `card` | border + soft shadow, radius `lg` | Feed posts, content cards |
| `hero` | border + shadow, radius `xl`, overflow hidden | Profile header, mini profile rail |
| `tinted` | `surface-subtle` bg, no border | Inputs, own-message bubbles |
| `row` | transparent bg, bottom border only | List item inside a flat container |

**Anti-pattern:** every section on a page using `card`. The eye needs hierarchy.

## 4. Component inventory

Status key: ✅ spec'd & prototyped · 🟡 prototyped only · ⏳ not started

### Atoms (in `packages/ui-web` + `packages/ui-native`)

| Component | Status | Spec |
|---|---|---|
| `Button` | ✅ | `docs/components/Button.md` |
| `Input` / `Textarea` | 🟡 | — |
| `Avatar` | ✅ | `docs/components/Avatar.md` |
| `Badge` | 🟡 | — |
| `Icon` | 🟡 | Wraps lucide-react (web) / lucide-react-native (mobile) |
| `Surface` | ✅ | `docs/components/Surface.md` |
| `Chip` | 🟡 | — |

### Molecules

| Component | Status | Spec |
|---|---|---|
| `PostCard` | ✅ | `docs/components/PostCard.md` |
| `ConnectionRow` | 🟡 | — |
| `MessageBubble` | ✅ | `docs/components/MessageBubble.md` |
| `RoomListItem` | 🟡 | — |
| `EmptyState` | ⏳ | — |
| `Skeleton` | ⏳ | — |

### Organisms

| Component | Status | Spec |
|---|---|---|
| `AppShell` | ✅ | `docs/components/AppShell.md` |
| `Composer` | 🟡 | — |
| `ProfileHeader` | 🟡 | — |
| `Thread` | 🟡 | — |
| `RightRail` | 🟡 | — |

### Screens → routes

| Screen | Route (web) | Screen (mobile) | Prototype | Status |
|---|---|---|---|---|
| Feed | `/[locale]/(app)/feed` | `FeedScreen` | §Feed | 🟡 |
| Profile | `/[locale]/(app)/u/[handle]` | `ProfileScreen` | §Profile | 🟡 |
| Network | `/[locale]/(app)/network` | `NetworkScreen` | §Network | 🟡 |
| Messages | `/[locale]/(app)/messages` | `MessagesScreen` | §Messages | 🟡 |
| Search | `/[locale]/(app)/search` | `SearchScreen` | §Search | 🟡 |
| Jobs | `/[locale]/(app)/jobs` | `JobsScreen` | — | ⏳ |
| Notifications | `/[locale]/(app)/notifications` | `NotificationsScreen` | — | ⏳ |

## 5. Layout patterns

### Web — 3-column grid (Feed, 1128 max)
`225px | 1fr | 300px` with 24px gutter. Left rail sticky below nav (56px). Right rail sticky, ads + suggestions.

### Web — 2-column (Network, Search)
`220px | 1fr` with 24px gutter. 900 max width. Left rail = filters.

### Web — single column (Messages)
1100 max width, full card holds 320px room list + flexible thread pane.

### Mobile
Single column, edge-to-edge cards with 16px horizontal padding, bottom tab bar 64pt high with 5 items.

## 6. Interaction patterns

- **Hover**: surface-subtle background fill, 120ms ease.
- **Press/active**: 1px translateY down, 80ms.
- **Focus**: 2px outline in `--brand-500`, 2px offset, 4px radius.
- **Optimistic UI**: reactions, connection requests, message sends all update instantly; reconcile on server echo by `clientMessageId`.
- **Empty states**: always include an illustration slot, a line of explanation, and a primary action. Never a bare "No results."
- **Skeletons**: for any list that fetches. Three skeleton items minimum, animated with a slow left-to-right shimmer.

## 7. What NOT to do

- ❌ Tailwind blue anywhere.
- ❌ Gradients anywhere *except* the profile cover strip (and that's a single specific linear olive gradient — do not reuse).
- ❌ Emoji in product chrome. In user-generated content only.
- ❌ Hand-drawn complex SVGs. Use placeholders with a monospace label for imagery we don't have yet.
- ❌ Inventing new font sizes outside the 7-step scale.
- ❌ Adding a card wrapper "because it looks unfinished without one." Empty space is fine.
- ❌ Dark mode (not yet designed).
- ❌ Multiple primary CTAs on one screen.

## 8. Token rename from old palette

The repo currently ships a Tailwind-blue `brand` palette. It must be replaced wholesale. The rename is mechanical:

```
OLD (generic blue)          NEW (olive)
--brand-500 #3b82f6    →    --brand-500 #687a3a
--brand-600 #2563eb    →    --brand-600 #526030
… (see packages/ui-tokens/src/index.ts)
```

Component usage stays the same (`bg-brand-600`). Only token values change. One commit, one file: `packages/ui-tokens/src/index.ts`. Rebuild everything else from there.

## 9. The prototype

`docs/design/prototype/PalNet Prototype.html` is the visual ground truth. Open it, navigate the five screens, and match what you build to what's rendered. When this document and the prototype disagree, **the prototype wins** — and open a PR updating this document.
