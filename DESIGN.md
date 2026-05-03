# DESIGN.md — Baydar design system source of truth

> Location in repo: **root** (same level as `CLAUDE.md`).
> This document governs every visual and interaction decision. When it conflicts with anything else, this wins.
> Companion specs live in [docs/design/](docs/design/) and [docs/components/](docs/components/). See the cross-reference at the end of §0.

## 0. How this document is organised

| §   | Topic                                                                      |
| --- | -------------------------------------------------------------------------- |
| 1   | Direction & feel — the voice the product should have                       |
| 2   | Human & task — who uses Baydar and what they're doing                      |
| 3   | What Baydar is — name, metaphor, posture                                   |
| 4   | The three non-negotiables                                                  |
| 5   | Visual language — color, type, space, radius, shadow, surfaces             |
| 6   | Signature pattern — the field-row composition that ties screens            |
| 7   | Component inventory — what ships in `ui-web` and `ui-native`               |
| 8   | Cross-platform parity — see [docs/design/PARITY.md](docs/design/PARITY.md) |
| 9   | Navigation chrome — see [docs/design/NAV.md](docs/design/NAV.md)           |
| 10  | Layout patterns — web grids and mobile column                              |
| 11  | Screens — see [docs/design/SCREENS.md](docs/design/SCREENS.md)             |
| 12  | Interaction patterns                                                       |
| 13  | What NOT to do                                                             |
| 14  | Token state                                                                |
| 15  | The prototype                                                              |

## 1. Direction & feel

Baydar is an Arabic-first professional network for Arab professionals. The interface should feel **serious, warm, local, and trustworthy** — closer to a well-run professional majlis or regional hiring office than to a generic SaaS dashboard.

The design language is built from Baydar's world: olive groves, wheat fields, warm paper, terracotta clay, limestone, and dark Arabic ink. The product should never drift toward LinkedIn blue, generic SaaS blue, dark mode, playful chrome, or marketing-page decoration.

We optimise for **confidence and quick scanning** — compact enough for repeated daily use, clear enough for first-time onboarding, and polite enough for professional communication.

## 2. Human & task

**Primary human:** an Arab professional checking opportunities, profile credibility, connections, messages, and posts on mobile. They may be commuting, between meetings, or quickly following up after an introduction.

**Core verbs:** register, complete profile, post, connect, apply, message, search, review notifications.

Every screen is judged against these verbs. If a screen doesn't help one of them, it doesn't ship.

## 3. What Baydar is

**Baydar** (بيدر) — the threshing floor, where farmers bring their harvest to be sorted and traded. It's our metaphor for a professional network: a shared ground where people bring what they've built, see and be seen, and trade.

- **Arabic-first, not Arabic-translated.** Every screen designed in RTL first.
- **Regional, not global-generic.** Olive, warm whites, serious restraint. Not Tailwind blue.
- **Professional, not corporate.** Editorial warmth over SaaS sterility.

## 4. The three non-negotiables

1. **Olive primary, terracotta accent.** No blue. Ever.
2. **Logical CSS properties only** (`start` / `end`, never `left` / `right`). See [docs/design/RTL.md](docs/design/RTL.md).
3. **Tokens are the only source of values.** No hardcoded colors, sizes, or spacing in components.

## 5. Visual language

### 5.1 Color

| Role           | Token                        | Value                 | Use                                                              |
| -------------- | ---------------------------- | --------------------- | ---------------------------------------------------------------- |
| Brand primary  | `--brand-600`                | `#526030`             | CTAs, active nav, logo                                           |
| Brand dark     | `--brand-700`                | `#3f4a26`             | Hover state on primary                                           |
| Brand tint     | `--brand-50` / `--brand-100` | `#f4f6ef` / `#e6ebd6` | Own-message bubbles, subtle highlights                           |
| Accent         | `--accent-600`               | `#a8482c`             | Unread badges, notification dots, **at most one CTA per screen** |
| Ink            | `--ink`                      | `#1a1a17`             | Body text                                                        |
| Ink muted      | `--ink-muted`                | `#5c5a52`             | Secondary text                                                   |
| Ink subtle     | `--ink-subtle`               | `#8a8880`             | Captions, timestamps                                             |
| Surface        | `--surface`                  | `#ffffff`             | Primary card bg                                                  |
| Surface muted  | `--surface-muted`            | `#faf9f5`             | Page background                                                  |
| Surface subtle | `--surface-subtle`           | `#f1efe7`             | Input bg, hovered rows                                           |
| Surface sunken | `--surface-sunken`           | `#ebe8dc`             | Quiet rails, deeper inset blocks                                 |
| Line soft      | `rgba(26,26,23,0.08)`        | —                     | Internal dividers                                                |
| Line hard      | `rgba(26,26,23,0.16)`        | —                     | Input borders, outlined buttons                                  |

**Forbidden:** pure `#000`, pure `#fff` shadows, Tailwind default blues/slates. Dark mode is not yet designed — do not add it.

All UI color must map through the tokens in [packages/ui-tokens/src/index.ts](packages/ui-tokens/src/index.ts) (web CSS vars + Tailwind classes) or [packages/ui-tokens/src/tokens.native.ts](packages/ui-tokens/src/tokens.native.ts) (`nativeTokens.color.*` for React Native). Never hardcode a hex at the screen level.

### 5.2 Typography

| Step      | Web | Mobile | Weight | Line | Use                        |
| --------- | --- | ------ | ------ | ---- | -------------------------- |
| `display` | 36  | 28     | 700    | 1.15 | Landing hero, empty states |
| `h1`      | 26  | 22     | 600    | 1.25 | Page title                 |
| `h2`      | 19  | 18     | 600    | 1.35 | Section header             |
| `h3`      | 16  | 16     | 600    | 1.40 | Card header, name in post  |
| `body`    | 15  | 15     | 400    | 1.60 | Post body, messages        |
| `small`   | 13  | 13     | 400    | 1.50 | Headline, meta             |
| `caption` | 12  | 12     | 500    | 1.40 | Timestamps, counts         |

Mobile values come from `nativeTokens.type.scale` in [packages/ui-tokens/src/tokens.native.ts](packages/ui-tokens/src/tokens.native.ts).

**Families:**

- Headings & UI: **IBM Plex Sans Arabic** (`nativeTokens.type.family.sans`). Latin fallback bundled.
- Body: **Noto Naskh Arabic** (`nativeTokens.type.family.body`). Latin fallback bundled.
- Numerals & code: **IBM Plex Mono** (`nativeTokens.type.family.mono`).

Load fonts via `next/font/google` in `apps/web/app/layout.tsx`. Do not use `<link>` in production. On mobile, use `expo-font` with the same families bundled locally.

Mixed Arabic+Latin content (e.g. `Full Stack Engineer`, `React`, `Node.js`, `PostgreSQL`) must remain readable inside RTL layouts without clipping. Use `unicode-bidi: plaintext` or `dir="auto"` per [docs/design/RTL.md](docs/design/RTL.md).

### 5.3 Spacing scale

Linear scale in 4px units (web `--space-N`, native `nativeTokens.space[N]`):

`0=0, 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64, 20=80, 24=96`. Don't invent intermediate values.

### 5.4 Radii

`xs=4, sm=6, md=10, lg=14, xl=20, full=9999`. Cards `lg`, buttons `md`, pills `full`. Avatars always `full`.

### 5.5 Shadows

Two only: `card` (quiet, resting elevation) and `pop` (modals, dropdowns). Don't invent more.

### 5.6 Surfaces — DIFFERENTIATE, don't flatten

Five variants. Use them deliberately. See [docs/components/Surface.md](docs/components/Surface.md).

| Variant  | Visual                                        | When                              |
| -------- | --------------------------------------------- | --------------------------------- |
| `flat`   | border only, no shadow                        | List containers, sidebar cards    |
| `card`   | border + soft shadow, radius `lg`             | Feed posts, content cards         |
| `hero`   | border + shadow, radius `xl`, overflow hidden | Profile header, mini profile rail |
| `tinted` | `surface-subtle` bg, no border                | Inputs, own-message bubbles       |
| `row`    | transparent bg, bottom border only            | List item inside a flat container |

**Anti-pattern:** every section on a page using `card`. The eye needs hierarchy.

## 6. Signature pattern

Baydar's reusable signature is the **field-row composition**:

1. **Compact header** — `AppShell` (web) / per-screen header (mobile). Title, optional subtitle, leading identity, trailing one-command slot.
2. **Search entry** — `surface-subtle` pill, magnifier glyph, Arabic-first placeholder. Lives in `AppShell` on web, in the screen header on mobile.
3. **Segmented olive control** — `Tabs` for filters and sub-routes. Selected state uses `brand-600` underline + `ink` label; inactive uses `ink-muted`.
4. **Composer entry** — collapsed `Composer` row on Feed only. Avatar + prompt pill + quiet attach chips.
5. **Profile completion rail** — `hero` surface with progress copy on Feed left rail / Profile screen top.
6. **Dense record cards** — `RoomRow`, `PostCard`, connection rows. Avatar + title + meta + one trailing action or badge. No nesting.
7. **Terracotta commit action** — at most one `accent`-variant `Button` per screen, reserved for the user's commit moment (post, send, apply, connect-confirm).

This composition appears across Feed, Network, Jobs, Messages, Notifications, Search, Profile, and Onboarding. New screens should compose from this kit — not invent a new layout.

## 7. Component inventory

Truth: what exists in `packages/ui-web/src/` and `packages/ui-native/src/` today. Status key: ✅ shipped · 🟡 partial / app-local · ⏳ not started.

### 7.1 Atoms

| Component            | Web | Native | Spec                                                     |
| -------------------- | --- | ------ | -------------------------------------------------------- |
| `Button`             | ✅  | ✅     | [docs/components/Button.md](docs/components/Button.md)   |
| `Avatar`             | ✅  | ✅     | [docs/components/Avatar.md](docs/components/Avatar.md)   |
| `Icon`               | ✅  | ✅     | wraps lucide-react / lucide-react-native                 |
| `Surface`            | ✅  | ✅     | [docs/components/Surface.md](docs/components/Surface.md) |
| `Input` / `Textarea` | 🟡  | 🟡     | App-local for now — promote when 3+ screens reuse        |
| `Badge`              | 🟡  | 🟡     | App-local — promote when reused                          |
| `Chip`               | 🟡  | 🟡     | App-local — promote when reused                          |

### 7.2 Molecules

| Component          | Web                   | Native         | Spec                                                                       |
| ------------------ | --------------------- | -------------- | -------------------------------------------------------------------------- |
| `MessageBubble`    | ✅                    | ✅             | [docs/components/MessageBubble.md](docs/components/MessageBubble.md)       |
| `PostCard`         | ✅                    | 🟡 (app-local) | [docs/components/PostCard.md](docs/components/PostCard.md)                 |
| `PostCardSkeleton` | ✅                    | ✅             | [docs/components/PostCardSkeleton.md](docs/components/PostCardSkeleton.md) |
| `Skeleton`         | 🟡 (Tailwind utility) | ✅             | [docs/components/Skeleton.md](docs/components/Skeleton.md)                 |
| `RoomRow`          | ✅                    | 🟡 (app-local) | [docs/components/RoomRow.md](docs/components/RoomRow.md)                   |
| `TypingIndicator`  | ✅                    | 🟡 (app-local) | [docs/components/TypingIndicator.md](docs/components/TypingIndicator.md)   |
| `ConnectionRow`    | 🟡 (app-local)        | 🟡 (app-local) | — promote to shared kit                                                    |

### 7.3 Organisms

| Component       | Web            | Native              | Spec                                                       |
| --------------- | -------------- | ------------------- | ---------------------------------------------------------- |
| `AppShell`      | ✅             | 🟡 (app-local tabs) | [docs/components/AppShell.md](docs/components/AppShell.md) |
| `Composer`      | ✅             | 🟡 (app-local)      | [docs/components/Composer.md](docs/components/Composer.md) |
| `Tabs` / `Tab`  | ✅             | ⏳                  | [docs/components/Tabs.md](docs/components/Tabs.md)         |
| `Sheet`         | ⏳             | ✅                  | [docs/components/Sheet.md](docs/components/Sheet.md)       |
| `ProfileHeader` | 🟡 (app-local) | 🟡 (app-local)      | — promote when stable                                      |
| `Thread`        | 🟡 (app-local) | 🟡 (app-local)      | — promote when stable                                      |
| `RightRail`     | 🟡 (app-local) | n/a                 | web-only by definition                                     |

**Parity gap policy:** every web component should have a native twin in `@baydar/ui-native` with the same prop names. App-local mobile implementations are tolerated as a step on the way to the shared kit, but cross-platform consistency means a shared component is the goal. Tracking matrix lives in [docs/design/PARITY.md](docs/design/PARITY.md).

### 7.4 Screens → routes

| Screen        | Route (web)                     | Mobile screen         | Status |
| ------------- | ------------------------------- | --------------------- | ------ |
| Feed          | `/[locale]/(app)/feed`          | `FeedScreen`          | ✅     |
| Profile       | `/[locale]/(app)/u/[handle]`    | `ProfileScreen`       | ✅     |
| Network       | `/[locale]/(app)/network`       | `NetworkScreen`       | ✅     |
| Messages      | `/[locale]/(app)/messages`      | `MessagesScreen`      | ✅     |
| Search        | `/[locale]/(app)/search`        | `SearchScreen`        | ✅     |
| Jobs          | `/[locale]/(app)/jobs`          | `JobsScreen`          | ✅     |
| Notifications | `/[locale]/(app)/notifications` | `NotificationsScreen` | ✅     |
| Auth          | `/[locale]/(auth)/login` etc.   | `AuthStack`           | ✅     |

Per-screen recipes (surfaces, components, copy stance, states) live in [docs/design/SCREENS.md](docs/design/SCREENS.md).

## 8. Cross-platform parity

Web and mobile must stay in lockstep on prop names, variant names, and visual identity. Drift is how a design system rots.

The shared-kit parity matrix and gap list lives in [docs/design/PARITY.md](docs/design/PARITY.md).

## 9. Navigation chrome

Web top nav, mobile bottom tab bar, search behaviour, badge formatting, ARIA, and RTL keyboard rules are all specified in [docs/design/NAV.md](docs/design/NAV.md). Read that file before touching any nav code.

## 10. Layout patterns

### 10.1 Web — 3-column grid (Feed, 1128 max)

`225px | 1fr | 300px` with 24px gutter. Left rail sticky below nav (56px). Right rail sticky, suggestions + jobs.

### 10.2 Web — 2-column (Network, Search)

`220px | 1fr` with 24px gutter. 900 max width. Left rail = filters.

### 10.3 Web — single column (Messages)

1100 max width, full card holds 320px room list + flexible thread pane.

### 10.4 Mobile

Single column, edge-to-edge cards with 16px horizontal padding, bottom tab bar 64pt high with 5 items. See [docs/design/MOBILE.md](docs/design/MOBILE.md) for the full mobile override sheet.

## 11. Screens

Per-screen recipes (Feed, Profile, Network, Jobs, Messages, Notifications, Search, Auth/Onboarding) — surfaces used, components composed, copy stance, loading/empty/error/offline states, mobile divergences — live in [docs/design/SCREENS.md](docs/design/SCREENS.md).

## 12. Interaction patterns

- **Hover** (web): `surface-subtle` background fill, 120ms ease.
- **Press / active**: 1px translateY down (web), opacity 0.85 + scale 0.97 + light haptic (mobile), 80ms.
- **Focus**: 2px outline in `--brand-600`, 2px offset, 4px radius. Visible on keyboard only (`:focus-visible`).
- **Optimistic UI**: reactions, connection requests, message sends all update instantly; reconcile on server echo by `clientMessageId`.
- **Empty states**: always include an illustration slot, a line of explanation in Arabic-first copy, and a primary action when one is recoverable. Never a bare "No results."
- **Loading states**: skeleton items for any list that fetches. Three minimum, animated with a slow shimmer (web 1.4s, mobile 1.2s loop in `Skeleton.tsx`).
- **Offline**: every fetch screen shows an offline banner + retry. Pattern lives in mobile `OfflineBanner` component.

## 13. What NOT to do

- ❌ Tailwind blue or any generic SaaS blue.
- ❌ Dark mode (not yet designed).
- ❌ Nested cards. Use `flat` or `row` inside a `card`.
- ❌ Decorative gradients, orbs, bokeh, hero illustration chrome. Profile cover gradient is the single allowed exception.
- ❌ Large hero type inside dense app screens.
- ❌ Floating sections styled as cards "to make it pop." That's `card` — promote it intentionally or leave it `flat`.
- ❌ Unlabeled icon-only actions. Every interactive element gets `aria-label` (web) / `accessibilityLabel` (native).
- ❌ Missing loading, empty, offline, API-error, retry, disabled, or success states.
- ❌ Emoji in product chrome. User-generated content only.
- ❌ Hand-drawn complex SVGs. Use placeholders with a monospace label for imagery we don't have yet.
- ❌ Inventing new font sizes outside the 7-step scale.
- ❌ Multiple primary CTAs on one screen.

## 14. Token state

The old default-blue palette has already been replaced. Current token values live in:

- [packages/ui-tokens/src/index.ts](packages/ui-tokens/src/index.ts) — TypeScript source.
- [packages/ui-tokens/src/tokens.css](packages/ui-tokens/src/tokens.css) — generated web CSS vars.
- [packages/ui-tokens/src/tokens.native.ts](packages/ui-tokens/src/tokens.native.ts) — generated `nativeTokens` for RN.

Do not hardcode new visual values in apps or shared UI packages. Add or adjust a token first, regenerate token outputs, and run `pnpm lint:tokens`.

## 15. The prototype

[docs/\_archive/prototype-2025/Baydar Prototype.html](docs/_archive/prototype-2025/Baydar%20Prototype.html) is the visual ground truth. Open it, navigate the screens, and match what you build to what's rendered.

When this document and the prototype disagree, **the prototype wins** — and open a PR updating this document.
