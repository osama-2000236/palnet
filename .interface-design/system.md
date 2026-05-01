# Baydar Interface Design System

## Direction And Feel

Baydar is an Arabic-first professional network for Arab professionals. The interface should feel serious, warm, local, and trustworthy: closer to a well-run professional majlis or regional hiring office than to a generic SaaS dashboard.

The design language is built from Baydar's world: olive groves, wheat fields, warm paper, terracotta clay, limestone, and dark Arabic ink. The product should never drift toward LinkedIn blue, generic SaaS blue, dark mode, playful chrome, or marketing-page decoration.

## Human And Task

Primary human: an Arab professional checking opportunities, profile credibility, connections, messages, and posts on mobile. They may be commuting, between meetings, or quickly following up after an introduction.

Core verbs: register, complete profile, post, connect, apply, message, search, review notifications.

The interface should optimize for confidence and quick scanning: compact enough for repeated use, clear enough for first-time onboarding, and polite enough for professional communication.

## Palette

- Primary olive: `#526030`, used for core identity, selected navigation, primary actions, active tabs, and profile completion.
- Terracotta: `#a8482c`, used for decisive actions and urgent emphasis: submit, send, apply, unread badges.
- Warm off-white canvas: `#faf9f5`, used as the app background.
- White surface: `#ffffff`, used for individual records, forms, and framed tools.
- Warm inset surface: `#f1efe7` / `#ebe8dc`, used for inputs, empty states, rails, and quiet grouping.
- Dark ink: `#1a1a17`, with muted levels for metadata and secondary text.

All UI color must map through `nativeTokens`; no random screen-level hex values.

## Depth Strategy

Use subtle shadows plus whisper borders.

- App canvas: warm off-white, no decorative gradients.
- Records/forms/tools: white surface, 1px soft border, very subtle card shadow.
- Inset content: warm tinted surface, no shadow.
- Lists should not use nested cards; each row is one record surface.
- Detail routes can use a hero surface only when the content has an identity anchor, such as profile or job detail.

## Spacing And Shape

- Base unit: 4px via `nativeTokens.space`.
- Screen gutters: `space[4]`.
- Screen top rhythm: compact headers use `space[3]` top padding.
- Record gap: `space[2]` to `space[3]`.
- Forms: field gap `space[2]` or `space[3]`; section gap `space[4]`.
- Radius: small controls use `radius.md`, record cards use `radius.lg`, hero/profile shells use `radius.xl`, chips/pills use `radius.full`.
- Minimum touch target: `nativeTokens.chrome.minHit`.

## Typography

Use Baydar native fonts from tokens:

- UI sans: `IBMPlexSansArabic`, for labels, headings, buttons, navigation, metadata.
- Body: `NotoNaskhArabic`, for long Arabic paragraphs and post bodies.
- Mono: `IBMPlexMono`, only for handles, counters, and technical values.

Keep Arabic text right aligned by default. Mixed English content such as `Full Stack Engineer`, `React`, `Node.js`, and `PostgreSQL` must remain readable inside RTL layouts without clipping.

## Signature Pattern

Baydar's reusable signature is the field-row system:

- Header/search/composer stack on feed.
- Segmented olive controls for tabs and filters.
- Profile completion rail and progress language.
- Dense record cards with avatar/company mark, title, meta, and one clear action.
- Terracotta send/apply/post action when a user commits something.

This signature should appear across feed, network, jobs, messages, notifications, search, profile, and onboarding.

## Component Patterns

### AppHeader

Use `AppHeader` for app screens and detail headers. It carries title, optional subtitle, leading identity, trailing command, and optional search.

Do:

- Keep title concise.
- Use subtitle for context, not instructions.
- Use trailing only for one clear command.

### SearchField

Use `SearchField` for search and filtering inputs.

Do:

- Prefer `data-testid` on core search fields.
- Include clear action when text is present.
- Keep placeholder Arabic-first.

### SegmentedControl

Use `SegmentedControl` for tab-like filters.

Do:

- Use real `tablist` / `tab` semantics.
- Use olive selected state.
- Keep 2-4 items visible and touch-safe.

### StateMessage

Use `StateMessage` for loading-adjacent empty/error/offline/retry states.

Do:

- Provide retry when the user can recover.
- Use Arabic-first copy.
- Keep the block quiet and centered.

### ComposerEntry

Use `ComposerEntry` for feed post entry points.

Do:

- Show avatar, prompt, and one action affordance.
- Keep it as a record tool, not a marketing card.

### RecordCard

Use `RecordCard` for people, jobs, rooms, notifications, and compact records.

Do:

- Leading mark/avatar.
- Title and subtitle/meta.
- One trailing badge or action.
- No nested card inside.

## Screen Rules

- Feed: header, search entry, composer, profile rail, post records.
- Profile: cover band, overlapping avatar, identity, actions, segmented sections.
- Network: segmented filters, compact people rows, direct connection states.
- Jobs: search first, filters second, job rows, detail with inline apply.
- Messages: room list with unread badge; thread composer uses send icon and disabled state.
- Notifications: dense readable records with unread dot.
- Search: strong search field, empty prompt, result rows.
- Auth/onboarding: one primary action per step, field-local validation, warm trust copy.

## Avoid

- LinkedIn blue or generic SaaS blue.
- Dark mode.
- Nested cards.
- Decorative gradients, orbs, bokeh, or empty illustration chrome.
- Large hero type inside dense app screens.
- Floating sections styled as cards.
- Unlabeled icon-only actions.
- Missing loading, empty, offline, error, retry, disabled, or success states.

## QA Checks

Before shipping UI work:

- Browser preview has no red overlay and no console errors.
- All protected routes redirect or load correctly.
- Every mutation has loading/disabled/error/success feedback.
- Every fetch screen has loading/empty/offline/API error/retry where applicable.
- Arabic RTL remains usable at desktop preview and narrow mobile width.
- Search, composer, profile edit, job apply, message send, and network filters have stable test IDs.
- `pnpm mobile:recovery-check`, mobile Jest, API Jest, API type-check/lint, DB lint, and `git diff --check` pass for broad work.
