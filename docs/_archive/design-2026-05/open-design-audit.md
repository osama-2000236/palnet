# Open Design Audit - Baydar Web and Mobile

Generated: 2026-05-21

## Executive Verdict

This audit makes Open Design usable for Baydar without letting it override Baydar's own brand system.

- Open Design repository checked at `C:\LinkedIn\open-design`.
- Verified revision: local `HEAD`, `origin/main`, and live GitHub `main` are `26ee030b4cfa340049ee2b338532a937aa4b90c1`.
- Preflight note: the local checkout was behind live GitHub by 11 commits at the start of this implementation wave and was fast-forwarded from `ce952665863428e097b15a80035598e14315a689` to `3f7a05e7462f097bf38b7cbac0d4a4593deecd80` before route work continued. Follow-up verification found GitHub `main` had advanced again, so Open Design was fast-forwarded through `21e75225741c6f797d2bc50afa0ebb6efeca86c4` to `26ee030b4cfa340049ee2b338532a937aa4b90c1`.
- Open Design inventory at that revision:
  - `skills/`: 132 skill directories
  - `design-templates/`: 110 template directories
  - `design-systems/`: 151 design system directories
- Baydar visual authority remains root `DESIGN.md`.
- Open Design authority is workflow, prompting discipline, critique method, template use, and cross-platform implementation checks.
- The zip handoff at `C:\Users\osama\Downloads\1652025 design upgrades.zip` is design evidence only. Every code snippet from it must be diffed against current repo files before use.

## Authority Stack

1. `DESIGN.md` wins all brand, color, typography, spacing, RTL, component, and screen conflicts.
2. `BRAND.md`, `docs/design/RTL.md`, `docs/design/MOBILE.md`, `docs/design/NAV.md`, `docs/design/PARITY.md`, and `docs/design/SCREENS.md` refine Baydar rules.
3. Open Design wins workflow: discovery, seed/template discipline, design-system schema, anti-slop rules, direction awareness, checklist gates, and 5-dimension critique.
4. Zip handoff files supply intent, examples, and a risk map, never blind implementation.
5. Existing repo patterns win file organization, data access, testing style, package APIs, and framework-specific implementation details.

## Source Map

| Source                                              | Role                         | Use                                                                                       |
| --------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| `open-design/README.md`                             | Project framing              | Treat OD as a method for system-backed interface generation, not as Baydar's style guide. |
| `open-design/QUICKSTART.md`                         | Prompt stack                 | Compose base prompt, active design system, task skill, and user request.                  |
| `open-design/docs/modes.md`                         | Mode model                   | Use Prototype and Design System thinking for app/web/mobile implementation.               |
| `open-design/docs/design-systems.md`                | Design-system schema         | Keep Baydar tokens, components, accessibility, and implementation notes explicit.         |
| `open-design/apps/daemon/src/prompts/discovery.ts`  | Discovery workflow           | Read design sources first, create a plan, use checklists, and avoid generic output.       |
| `open-design/apps/daemon/src/prompts/directions.ts` | Direction discipline         | Recognize visual directions, but bind Baydar to warm professional product UI.             |
| `open-design/apps/daemon/src/prompts/system.ts`     | Prompt layering              | Keep prompt order explicit so design system and skill context are not mixed up.           |
| `open-design/design-templates/web-prototype`        | Web implementation method    | Use template/checklist discipline for responsive web surfaces.                            |
| `open-design/design-templates/mobile-app`           | Mobile implementation method | Use mobile archetype, phone-frame thinking, 44px targets, and one-screen focus.           |
| `open-design/design-templates/dashboard`            | Dense product layouts        | Use for app shell, rails, lists, metrics-like status blocks, and operational surfaces.    |
| `open-design/design-templates/critique`             | Review gate                  | Score philosophy, hierarchy, detail, functionality, and innovation/restraint.             |
| `open-design/design-templates/tweaks`               | Iteration discipline         | Useful for controlled visual adjustments, not primary production UI.                      |
| `DESIGN.md`                                         | Baydar truth                 | Governs all product visual and interaction decisions.                                     |
| `BRAND.md`                                          | Brand voice                  | Keeps Baydar local, professional, and not a LinkedIn clone.                               |
| `docs/design/RTL.md`                                | RTL contract                 | Logical CSS, mirrored icons, mixed-direction text, and input direction.                   |
| `docs/design/MOBILE.md`                             | Expo contract                | Safe areas, bottom tabs, 44pt targets, FlatList, haptics, accessibility, and performance. |
| `docs/design/PRODUCT-HEALTH-2026-05-16.md`          | Prior risk map               | Use as a current gap checklist, not as final truth.                                       |
| Zip Product Health Report                           | External evidence            | Compare against current repo before adopting any proposed snippet.                        |
| Zip Sprint 1/2 deliverables                         | External examples            | Extract intended states, atoms, and missing screens after diffing.                        |

## Relevant Open Design Rules Extracted

### Workflow Rules

- Start from the active design system. For Baydar, that is `DESIGN.md`, not an Open Design bundled design system.
- Read sources before code: brand, screen specs, mobile/RTL docs, current implementation, and zip evidence.
- Keep a visible implementation plan before broad edits.
- Do not generate screens from taste. Map each decision to a Baydar rule or an OD method rule.
- Use templates and checklists as production gates, even when not copying their HTML.
- Run a 5-dimension critique before calling a screen finished.

### Web Rules

- Use Baydar field-row composition:
  - compact header
  - search entry
  - segmented olive control
  - composer entry where relevant
  - profile completion rail where relevant
  - dense record cards
  - one terracotta commit action at most
- Use logical CSS properties only in app and UI code.
- Keep app screens dense, scannable, and professional. Avoid marketing composition inside authenticated workflows.
- Do not add hardcoded colors, spacing, font sizes, shadows, or one-off radii in screen files.
- Do not introduce Tailwind blue, generic SaaS blue, dark mode, or decorative gradients/orbs.
- Verify responsive behavior at `360`, `390`, `430`, `600`, `820`, `1024`, `1366`, `1440`, and `1920`.
- Verify both `ar-PS` RTL and `en` LTR.

### Mobile Rules

- Mobile is not compressed desktop.
- Use one-column screens with 16pt horizontal padding.
- Respect safe areas through `react-native-safe-area-context`.
- Use bottom tabs for the app shell.
- Minimum tap target is 44pt in both dimensions, with `hitSlop` where visuals are smaller.
- Long lists use `FlatList` or `FlashList`, not `ScrollView` with mapped rows.
- Add haptics on commit actions such as connect, post, like, apply, and send.
- Every touchable needs `accessibilityLabel`, correct role, and state where relevant.
- Mobile typography must tolerate Dynamic Type up to 200%.

### Critique Rules

Each production screen must score at least 7/10 in every Open Design critique dimension:

| Dimension            | Baydar interpretation                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| Philosophy           | Feels serious, warm, local, trustworthy, and Arabic-first.                  |
| Hierarchy            | The next professional action is obvious without oversized hero UI.          |
| Detail               | Tokens, RTL, focus, icons, copy, and states are precise.                    |
| Functionality        | Loading, empty, error, offline, disabled, and success states are usable.    |
| Innovation/restraint | Distinctly Baydar without decoration, fake metrics, or generic SaaS tropes. |

## Baydar Design Rules To Enforce

- Olive primary: `--brand-600` / native `nativeTokens.color.brand[600]`.
- Terracotta accent: `--accent-600` / native `nativeTokens.color.accent[600]`.
- Warm paper surfaces: `surface`, `surface-muted`, `surface-subtle`, `surface-sunken`.
- No blue in product chrome.
- No dark mode until explicitly designed.
- No nested cards.
- No decorative gradients, orbs, bokeh, or hero chrome.
- Tokens are the only source of visual values.
- App screens use normal product density, not landing-page display scale.
- Empty states include a helpful next action where recoverable.
- Offline and retry states are first-class, not console-only failures.
- Icon-only actions are labeled.

## Current Repo Findings

These findings guide the first implementation waves. They are intentionally scoped so unrelated dirty worktree changes are not reverted.

### Confirmed Strengths

- Baydar has a strong root `DESIGN.md` with brand, component inventory, route matrix, and non-negotiables.
- `docs/design/MOBILE.md` gives a usable Expo contract.
- `docs/design/RTL.md` gives detailed RTL rules.
- Token source already exists in `packages/ui-tokens/src/index.ts`.
- Web and native UI packages already exist, so parity work can happen incrementally.
- Prior work already added some web resilience and UI atoms, including `Alert`, `Chip`, `Input`, and root/app error surfaces.

### Gaps To Close

- `docs/design/SCREENS.md`, `docs/design/PARITY.md`, and `docs/design/NAV.md` are still thin compared with `DESIGN.md`.
- Some root-level web error surfaces still contain direct visual values and should be normalized where possible.
- Multiple app files are large enough to hide state and design drift:
  - `apps/mobile/app/(app)/onboarding.tsx`
  - `apps/web/src/app/[locale]/(app)/messages/page.tsx`
  - `apps/mobile/app/(app)/messages/[roomId].tsx`
  - `apps/web/src/app/[locale]/(app)/me/edit/page.tsx`
  - `packages/ui-web/src/AppShell.tsx`
- Settings subroutes, self-profile connections, session-expired, offline, and not-found/error handling need matrix-level verification.
- Native shared primitives need parity checks against web for prop names and visual states.
- Zip code proposals must be treated as stale until diffed against current repo.

## Screen Matrix

### Public Web

| Surface        | Route          | OD archetype                       | Required states                                                 |
| -------------- | -------------- | ---------------------------------- | --------------------------------------------------------------- |
| Landing        | `/[locale]`    | SaaS landing with Baydar restraint | primary CTA, secondary CTA, responsive RTL/LTR, no fake metrics |
| Root not found | app root 404   | resilience                         | localized route recovery, tokenized styling                     |
| Global error   | app root error | resilience                         | retry, home route, tokenized styling                            |

### Auth And Onboarding

| Surface      | Web route                      | Mobile route                  | Required states                                            |
| ------------ | ------------------------------ | ----------------------------- | ---------------------------------------------------------- |
| Login        | `/(auth)/login`                | auth stack                    | loading, invalid credentials, disabled submit, forgot link |
| Register     | `/(auth)/register`             | auth stack                    | loading, validation, success/verify handoff                |
| Forgot/reset | auth routes                    | auth stack                    | disabled, sent, expired token                              |
| Onboarding   | `/(app)/onboarding` bare shell | `(app)/onboarding` bare shell | progress, validation, save, retry, success                 |

### Authenticated Web

| Surface                | Route                           | Layout contract                              | Required states                                                      |
| ---------------------- | ------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| App shell              | `/(app)/layout`                 | compact top chrome, search entry, active nav | loading, offline, session expired, keyboard focus                    |
| Feed                   | `/feed`                         | 3-column field-row                           | skeleton, empty, API error, offline, composer disabled, post success |
| Jobs                   | `/jobs`                         | 2-column/list filters                        | loading, empty, filter no results, apply disabled, retry             |
| Messages               | `/messages`                     | single card with room list + thread          | loading rooms, empty rooms, failed rooms, empty thread, send retry   |
| Message room           | `/messages/[roomId]` if split   | thread focus                                 | send pending, send failed, offline                                   |
| Network                | `/network`                      | 2-column filters + dense rows                | loading, empty, pending state, connect success/failure               |
| Search                 | `/search`                       | search-first result list                     | initial, loading, no results, error, mixed RTL/LTR query             |
| Notifications          | `/notifications`                | dense record rows                            | loading, empty, dismiss/read success, offline                        |
| Public profile         | `/in/[handle]` or `/u/[handle]` | profile header + records                     | loading, missing profile, connect/message states                     |
| Self profile           | `/me`                           | profile completion rail                      | loading, missing sections, edit CTA                                  |
| Edit profile           | `/me/edit`                      | form workflow                                | validation, save disabled, save success, save failure                |
| Settings account       | `/settings`                     | work-focused form                            | disabled unsupported saves, no fake success                          |
| Settings notifications | `/settings/notifications`       | switches and preferences                     | loading, disabled unsupported saves, save success/failure            |
| Settings privacy       | `/settings/privacy`             | honest controls                              | coming/disabled states where backend absent                          |
| Settings security      | `/settings/security`            | security actions                             | session/device states, disabled unsupported actions                  |
| Saved                  | `/saved` if present             | record list                                  | empty, retry, remove saved                                           |

### Mobile

| Surface         | Route                           | Mobile contract                             | Required states                                   |
| --------------- | ------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| App shell       | `(app)/_layout`                 | bottom tabs, safe area, 44pt targets        | badge, selected state, offline/session indicators |
| Feed            | `(app)/feed`                    | FlatList, composer entry, inline rail cards | refresh, skeleton, empty, error, offline          |
| Composer        | `(app)/composer`                | modal or focused screen                     | disabled, draft, post success, post failure       |
| Jobs            | `(app)/jobs`                    | filter chips + list                         | refresh, empty, apply, retry                      |
| Messages        | `(app)/messages/index`          | FlatList rooms                              | refresh, empty, failed rooms                      |
| Message room    | `(app)/messages/[roomId]`       | safe keyboard layout                        | send pending, send failed, offline                |
| Network         | `(app)/network`                 | list + filters                              | refresh, empty, connect haptic, pending           |
| Search          | `(app)/search`                  | search-first                                | initial, loading, no results, mixed direction     |
| Notifications   | `(app)/notifications`           | list rows                                   | refresh, empty, read/dismiss                      |
| Profile         | `(app)/in/[handle]`, `(app)/me` | header + sections                           | loading, empty sections, edit state               |
| Settings        | `(app)/settings/index`          | list/detail controls                        | disabled unsupported settings, save states        |
| Auth/onboarding | auth routes, `(app)/onboarding` | no app chrome until complete                | validation, retry, success                        |

## Implementation Waves

### Wave 0 - Audit And Prompt Pack

Deliver:

- `docs/design/open-design-audit.md`
- `docs/design/open-design-implementation-prompt.md`

Gate:

- Both docs name authority order, source map, screen matrix, and verification criteria.
- No production code changes are needed for this wave.

### Wave 1 - Tokens And Primitive Parity

Deliver:

- Normalize token source first in `packages/ui-tokens/src/index.ts`.
- Regenerate web and native token outputs.
- Confirm shared primitive APIs across `@baydar/ui-web` and `@baydar/ui-native`:
  - `Button`
  - `Surface`
  - `Input`
  - `Chip`
  - `Alert` or `Banner`
  - `EmptyState`
  - `Skeleton`
  - `Switch`
  - `Dialog` or `Sheet`
  - `Avatar`

Gate:

- No hardcoded Baydar visual values added in screen files.
- Prop names are aligned where components exist on both platforms: `variant`, `size`, `disabled`, `loading`, `leading`, `trailing`, `label`, `helperText`, `error`, `selected`, `onPress` or `onClick`.
- `pnpm lint:tokens` passes if configured.
- Package checks pass for changed UI packages.

### Wave 2 - Web Shell And Resilience

Deliver:

- Tokenized root and app error surfaces.
- Loading, empty, error, offline/retry, disabled, and success patterns available in app shell context.
- No fake backend-backed success states.

Gate:

- Root and localized errors are usable from RTL and LTR.
- Focus-visible styles are visible.
- No unlabeled icon-only actions.

### Wave 3 - Web Core Screens

Deliver:

- Apply Baydar field-row pattern to landing, auth, app shell, feed, profile/self-profile, jobs, messages, network, search, notifications, settings, loading/error/not-found/empty/offline states.
- Split large monolith files only where it reduces state or design drift risk.

Gate:

- Each screen has a state table in code or docs.
- Each screen passes 5-dimension critique at 7/10 or better.
- Playwright responsive screenshots cover the required widths in RTL and LTR.

### Wave 4 - Mobile Parity

Deliver:

- Expo mobile app shell, bottom tabs, feed, composer, profile, jobs, messages, network, search, notifications, settings, auth/onboarding.
- Safe areas, 44pt targets, FlatList for long lists, pull-to-refresh, and haptics on commit actions.

Gate:

- `pnpm --filter @baydar/mobile type-check`, lint, and tests pass where configured.
- Maestro smoke flows pass where available.
- Dynamic Type and accessibility labels are verified on core flows.

### Wave 5 - Verification And Critique

Deliver:

- Static checks:
  - `pnpm lint:tokens`
  - `pnpm type-check`
  - `pnpm test`
  - package checks for `@baydar/ui-web`, `@baydar/ui-native`, `@baydar/web`, `@baydar/mobile`
- Web visual checks:
  - widths `360`, `390`, `430`, `600`, `820`, `1024`, `1366`, `1440`, `1920`
  - `ar-PS` RTL and `en` LTR
- Web behavior checks:
  - landing CTA
  - login/register/forgot
  - feed retry/empty
  - jobs filters
  - message room
  - profile
  - search
  - notifications
  - settings
- Mobile checks:
  - bottom tabs
  - safe area
  - 44pt targets
  - pull-to-refresh
  - message send
  - composer
  - offline banner
- Accessibility:
  - axe sweep on public and authenticated web surfaces
  - focus-visible checks
  - no unlabeled icon-only actions
  - mobile labels and roles

## Checklist Gate

No screen is complete until these are true:

- It uses Baydar tokens, not local visual constants.
- It is designed RTL-first and then checked in LTR.
- It has loading, empty, error, offline/retry, disabled, and success/confirmation states where relevant.
- It does not use blue, dark mode, decorative gradients/orbs, nested cards, fake metrics, or filler copy.
- It uses the shared UI kit where a primitive exists.
- It keeps mobile as a native one-column experience rather than desktop squeezed into a viewport.
- It has a documented 5-dimension OD critique score of at least 7/10 in every dimension.
