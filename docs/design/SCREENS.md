# Screen Recipes

`DESIGN.md` remains the source of truth. This file turns the field-row pattern into per-screen implementation checks for web and mobile.

Open Design critique scores are recorded in `docs/design/open-design-screen-critique.md`.

## Global Recipe

Every production screen should answer these before it ships:

- What is the user's next professional action?
- Which field-row elements are present?
- Which shared primitives are used?
- What are the loading, empty, error, offline/retry, disabled, and success states?
- What changes on mobile?
- What is the Open Design 5-dimension critique score?

No screen ships below 7/10 in philosophy, hierarchy, detail, functionality, or restraint.

## Public

| Screen         | Web route      | Field-row use                                     | Required states                                      |
| -------------- | -------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Landing        | `/[locale]`    | Brand signal, primary CTA, secondary sign-in path | responsive RTL/LTR, no fake metrics, no generic blue |
| Root not found | app root 404   | centered resilience surface                       | route recovery, tokenized style                      |
| Global error   | app root error | centered resilience surface                       | retry, digest, token-bound inline style              |

## Auth And Onboarding

| Screen       | Web route           | Mobile route       | Required states                                           |
| ------------ | ------------------- | ------------------ | --------------------------------------------------------- |
| Login        | `/(auth)/login`     | auth stack         | validation, loading, invalid credentials, disabled submit |
| Register     | `/(auth)/register`  | auth stack         | validation, loading, verify handoff                       |
| Forgot/reset | auth routes         | auth stack         | sent state, expired token, disabled submit                |
| Onboarding   | `/(app)/onboarding` | `(app)/onboarding` | bare shell, progress, validation, retry, success          |

## Authenticated Core

| Screen         | Web route                       | Mobile route              | Recipe                                                                          |
| -------------- | ------------------------------- | ------------------------- | ------------------------------------------------------------------------------- |
| Feed           | `/feed`                         | `(app)/feed`              | composer entry, profile completion rail, dense posts, inline mobile suggestions |
| Jobs           | `/jobs`                         | `(app)/jobs/index`        | search, chips/filters, dense job records, one apply action                      |
| Messages       | `/messages`                     | `(app)/messages/index`    | room list, empty thread, send pending/failed/retry                              |
| Message room   | split route when present        | `(app)/messages/[roomId]` | keyboard-safe thread, optimistic send, offline banner                           |
| Network        | `/network`                      | `(app)/network`           | filter tabs, invitations, pending/success/failure connect states                |
| Search         | `/search`                       | `(app)/search`            | initial prompt, loading, no results, mixed-direction query                      |
| Notifications  | `/notifications`                | `(app)/notifications`     | live badge, dense rows, read/dismiss success and failure                        |
| Public profile | `/in/[handle]` or `/u/[handle]` | `(app)/in/[handle]`       | profile header, sections, missing profile, connect/message states               |
| Self profile   | `/me`                           | `(app)/me/index`          | completion rail, edit CTA, empty sections                                       |
| Edit profile   | `/me/edit`                      | `(app)/me/edit`           | validation, upload, save disabled/success/failure                               |

## Settings

| Screen         | Web route                 | Mobile route                   | Status contract                                         |
| -------------- | ------------------------- | ------------------------------ | ------------------------------------------------------- |
| Settings index | `/settings`               | `(app)/settings/index`         | list of settings destinations with dense rows           |
| Account        | `/settings/account`       | `(app)/settings/account`       | real export/delete actions, confirmation state          |
| Notifications  | `/settings/notifications` | `(app)/settings/notifications` | fetched preferences, dirty state, save/revert           |
| Privacy        | `/settings/privacy`       | `(app)/settings/privacy`       | staged controls, disabled save, no fake backend success |
| Security       | `/settings/security`      | `(app)/settings/security`      | staged controls, disabled save, no fake backend success |
| Blocked        | `/settings/blocked`       | `(app)/settings/blocked`       | loading, empty, unblock success/failure                 |

## Mobile Overrides

- Use `SafeAreaView` from `react-native-safe-area-context`.
- Use `ScrollView` only for short static settings/detail screens.
- Use `FlatList` or `FlashList` for long lists.
- Keep 44pt hit targets and add `hitSlop` where visuals are smaller.
- Use haptics on commit actions in screen code.
- Use one-column layout with `nativeTokens.space[4]` horizontal padding.
