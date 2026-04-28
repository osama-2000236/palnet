# Design System — Atoms, Molecules, Organisms

Shared tokens live in [`packages/ui-tokens`](../packages/ui-tokens). Components are implemented as platform-specific packages in `packages/ui-web` and `packages/ui-native`, with matching prop names and variant names wherever a component exists on both platforms.

## Component Inventory

### Atoms

- `Button` — variants: `primary`, `secondary`, `ghost`, `danger`; sizes: `sm`, `md`, `lg`; RTL-safe with leading/trailing icon slots.
- `IconButton` — square, accessible label required.
- `Input` — text input with label, hint, error state; supports RTL numerals.
- `Textarea` — auto-resizing, max length counter.
- `Checkbox`, `Radio`, `Switch`.
- `Avatar` — sizes `xs | sm | md | lg | xl`, fallback to initials in brand-500.
- `Badge` — variants: `neutral`, `brand`, `success`, `warning`, `danger`.
- `Tag` — removable, for skills/filters.
- `Spinner`.
- `Skeleton` — for loading states of every organism.
- `Divider`.
- `Link` — routes to `/in/:handle`, `/company/:slug`, `/jobs/:id`, etc.
- `Text`, `Heading` — typography primitives using `font-sans`/`font-body` tokens.
- `Icon` — from `lucide-react` (web) / `lucide-react-native` (mobile). Only one icon set allowed.
- `ReactionIcon` — six variants matching `ReactionType` enum.

### Molecules

- `FormField` — wraps `Input`/`Textarea`/`Checkbox` with label, hint, error.
- `SearchBar` — top nav search with suggestions.
- `PostComposerField` — rich(ish) text area with media picker button, character counter.
- `MediaAttachment` — renders image, video thumb, or doc chip.
- `CommentBox` — avatar + text + action row.
- `ConnectionCard` — avatar, name, headline, action button (Connect / Pending / Remove).
- `NotificationItem` — icon-by-type + actor avatar + body + read dot.
- `MessagePreview` — avatar, name, last-message snippet, unread badge.
- `JobCard` — company logo, title, location, type, posted-ago.
- `CompanyChip` — logo + name, used in search results.
- `EmptyState` — illustration slot, title, description, primary action.
- `ErrorState` — consistent retry surface.
- `ProfileHeader` — avatar, name, headline, location, primary CTA.

### Organisms

- `AppShell` — top nav (web) / tab bar (mobile). Must be RTL-flipped.
- `Feed` — infinite-scroll list of `PostCard`s with composer at the top.
- `PostCard` — author row, body, media grid, reaction bar, comment drawer toggle.
- `CommentThread` — list of `CommentBox` with one level of replies indented.
- `ProfilePage` — header + tabs (About, Experience, Education, Skills, Activity).
- `EditProfileForm` — split into sections matching entity groupings.
- `NetworkPage` — tabs (My connections, Invitations, Recommendations placeholder).
- `MessagingDock` (web) — bottom-right pinned dock with rooms list and active thread.
- `MessagingScreen` (mobile) — full-screen list + conversation stack.
- `NotificationsPanel` / `NotificationsScreen`.
- `JobsSearchPage` — filter rail + results list.
- `JobDetailPage` — job body + `ApplyModal`.
- `CompanyPage` — header + About + Jobs tabs.
- `CompanyAdminPage` — post job, manage jobs, manage members.
- `AuthForm` — register/login/onboard with identical field treatment across web and mobile.

## RTL Rules

- **Never use `left`/`right` in CSS.** Use `start`/`end` logical properties on the web. In NativeWind use `ps-*`/`pe-*`/`ms-*`/`me-*`.
- **Do not mirror icons** that carry semantic direction (email, phone, play, external-link). Mirror only navigation chevrons and progress indicators.
- **Numerals**: render using `{new Intl.NumberFormat('ar-PS').format(n)}` by default. Accept English digits in inputs and normalize before persist.
- **Dates**: `Intl.DateTimeFormat('ar-PS')` with Gregorian calendar. Relative time: `Intl.RelativeTimeFormat('ar-PS')`.
- **Layouts**: test every screen with `dir="ltr"` too — a few professional UIs (e.g., code blocks, English CV viewer) must stay LTR inside RTL shells.

## Density

- Default web breakpoint widths: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`. App shell is centered around the Baydar prototype's professional-network density.
- Mobile uses 4pt spacing grid; web uses 8pt. Do not hardcode `px` values outside tokens.

## Component Contract (for AI prompts)

When asking Codex/Gemini for a component, use this template:

```
Create <ComponentName> in packages/ui-<web|native>/src/<ComponentName>.tsx when it is shared, or in the host app only when it is route-specific.
- Props: typed from packages/shared if it consumes a domain object.
- Imports tokens from @baydar/ui-tokens when Tailwind classes aren't enough.
- All copy uses t('namespace.key'); add keys to ar.json and en.json.
- RTL-safe (no left/right, no unconditionally mirrored icons).
- Handles loading via <Skeleton> and error via <ErrorState>.
- Includes a Storybook/MDX example on web, or a dev-only demo screen on mobile, only if the task explicitly asks.
```

## What NOT to build yet

- Visual editor for posts (WYSIWYG).
- Custom fonts beyond IBM Plex Sans Arabic + Noto Naskh Arabic.
- Dark mode (not designed yet).
- Animated reactions popover (can use simple icons day one).
