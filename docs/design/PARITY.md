# Cross-Platform Parity

`DESIGN.md` remains the source of truth. This file tracks how closely the shared web and native UI kits match the Baydar contract.

## Rule

Web and native components share names, variant names, token intent, and prop vocabulary whenever both platforms ship the component. Native uses `onPress`; web uses `onClick`.

Preferred shared props:

- `variant`
- `size`
- `disabled`
- `loading`
- `leading`
- `trailing`
- `label`
- `helperText`
- `error`
- `selected`
- `onClick` / `onPress`

Back-compat aliases are allowed during migration, but new screen code should use the preferred prop names.

## Shared Primitive Matrix

Re-audited 2026-07-19 against both barrel files (`packages/ui-web/src/index.ts`,
`packages/ui-native/src/index.ts`).

| Primitive                                                                        | Web              | Native              | Parity status | Notes                                                                                |
| -------------------------------------------------------------------------------- | ---------------- | ------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `Button`                                                                         | `@baydar/ui-web` | `@baydar/ui-native` | Good          | Shared `variant`, `size`, `disabled`, `loading`, `leading`, `trailing`, `fullWidth`. |
| `Surface`                                                                        | `@baydar/ui-web` | `@baydar/ui-native` | Good          | Shared surface variants; mobile usage must avoid floating desktop card density.      |
| `Input`                                                                          | `@baydar/ui-web` | `@baydar/ui-native` | Good          | `helperText` is preferred; `helper` remains an alias.                                |
| `Checkbox`                                                                       | `@baydar/ui-web` | `@baydar/ui-native` | Good          |                                                                                      |
| `RadioGroup`                                                                     | `@baydar/ui-web` | `@baydar/ui-native` | Good          |                                                                                      |
| `Chip`                                                                           | `@baydar/ui-web` | `@baydar/ui-native` | Good          | `selected` is preferred; `active` remains an alias.                                  |
| `Banner`                                                                         | `@baydar/ui-web` | `@baydar/ui-native` | Good          | Use for top/status notices such as offline and staged settings.                      |
| `Alert`                                                                          | `@baydar/ui-web` | n/a                 | Partial       | Native can use `Banner` or `StateMessage` until a persistent native alert is needed. |
| `EmptyState`                                                                     | `@baydar/ui-web` | `@baydar/ui-native` | Good          | Must include recoverable action when possible.                                       |
| `Illustration`                                                                   | `@baydar/ui-web` | `@baydar/ui-native` | Good          | 10 motifs × 3 direction kits (`outline`/`block`/`harvest`, restored 2026-07-19).     |
| `OnboardingProgress`                                                             | `@baydar/ui-web` | `@baydar/ui-native` | Good          |                                                                                      |
| `Skeleton`                                                                       | `@baydar/ui-web` | `@baydar/ui-native` | Good          | Shared primitive shipped on both; `PostCardSkeleton` twins too.                      |
| `Switch`                                                                         | `@baydar/ui-web` | `@baydar/ui-native` | Good          | Use for binary settings only.                                                        |
| `Dialog` / `Sheet`                                                               | `Dialog`         | `Dialog`, `Sheet`   | Good          | Use modal/sheet by platform convention.                                              |
| `Avatar`                                                                         | `@baydar/ui-web` | `@baydar/ui-native` | Good          | Both now use token-backed deterministic palettes.                                    |
| `Icon`                                                                           | `@baydar/ui-web` | `@baydar/ui-native` | Good          | Same name set; brand mark sourced from `ui-tokens/assets/logo-mark.svg`.             |
| `Toast`                                                                          | `@baydar/ui-web` | `@baydar/ui-native` | Good          |                                                                                      |
| `AppShell`                                                                       | `@baydar/ui-web` | `@baydar/ui-native` | Good          | Layout differs by platform (desktop nav vs tabs); same name and intent.              |
| `PostCard`                                                                       | `@baydar/ui-web` | `@baydar/ui-native` | Drift         | Web exposes 5 actions (like/comment/repost/save/send), native 3 (like/comment/save). |
| `MessageBubble`                                                                  | `@baydar/ui-web` | `@baydar/ui-native` | Good          |                                                                                      |
| `RetryChip`                                                                      | `@baydar/ui-web` | `@baydar/ui-native` | Good          |                                                                                      |
| `Tabs`                                                                           | `Tabs`           | `SegmentedControl`  | Naming drift  | Same intent, different names — reconcile on next touch of either.                    |
| `ReportDialog`                                                                   | `ReportDialog`   | `ReportSheet`       | Naming drift  | Dialog/sheet by platform convention, but the name should share a stem.               |
| `Composer`                                                                       | `Composer`       | `ComposerEntry`     | Partial       | Native ships the entry point only; full composer lives in the route.                 |
| `ProfileHeader`                                                                  | `@baydar/ui-web` | n/a                 | Web-only      | Native composes profile header in-screen; promote a twin if a third screen needs it. |
| `RoomRow` / `TypingIndicator`                                                    | `@baydar/ui-web` | n/a                 | Web-only      | Native builds these inside `_message-thread/`; same 3-screen promotion rule.         |
| `AppHeader` / `SearchField` / `SegmentedControl` / `StateMessage` / `RecordCard` | n/a              | `@baydar/ui-native` | Native-only   | Platform idioms (header bar, search field, list record); no web demand yet.          |

## Screen Parity Rules

- Web can use multi-column app layouts at desktop breakpoints.
- Mobile remains one-column with bottom tabs and safe areas.
- Feature parity means the same user intent and states, not identical layouts.
- Every platform surface needs loading, empty, error, offline/retry, disabled, and success states where relevant.
- Settings screens without backend support render honest disabled/coming states, not fake saves.

## Current Known Gaps

- Native persistent `Alert` is not yet promoted; use `Banner`/`StateMessage` until three screens need it.
- `Tabs`/`SegmentedControl` and `ReportDialog`/`ReportSheet` naming drift — pick one stem when either component is next touched.
- Native has no date-picker primitive (`expiresAt` omitted from native post-a-job; server default applies).
- Illustration `direction` placement decided 2026-07-20: admin/internal surfaces use the `outline` kit (differentiates operator tools from the warm product surface); `block` stays unconsumed until a design pass claims it.
- Route-split pass done: web messages, mobile room thread, and web me/edit are thin shells over `_components`/`_hooks`; mobile onboarding sits at ~280 LOC, under the qa-design ceiling — split only if it grows.
