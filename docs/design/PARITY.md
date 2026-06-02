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

| Primitive          | Web                   | Native              | Parity status | Notes                                                                                |
| ------------------ | --------------------- | ------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `Button`           | `@baydar/ui-web`      | `@baydar/ui-native` | Good          | Shared `variant`, `size`, `disabled`, `loading`, `leading`, `trailing`, `fullWidth`. |
| `Surface`          | `@baydar/ui-web`      | `@baydar/ui-native` | Good          | Shared surface variants; mobile usage must avoid floating desktop card density.      |
| `Input`            | `@baydar/ui-web`      | `@baydar/ui-native` | Good          | `helperText` is preferred; `helper` remains an alias.                                |
| `Chip`             | `@baydar/ui-web`      | `@baydar/ui-native` | Good          | `selected` is preferred; `active` remains an alias.                                  |
| `Banner`           | `@baydar/ui-web`      | `@baydar/ui-native` | Good          | Use for top/status notices such as offline and staged settings.                      |
| `Alert`            | `@baydar/ui-web`      | n/a                 | Partial       | Native can use `Banner` or `StateMessage` until a persistent native alert is needed. |
| `EmptyState`       | `@baydar/ui-web`      | `@baydar/ui-native` | Good          | Must include recoverable action when possible.                                       |
| `Skeleton`         | app utility / partial | `@baydar/ui-native` | Partial       | Web should promote a shared skeleton primitive if repeated beyond local patterns.    |
| `Switch`           | `@baydar/ui-web`      | `@baydar/ui-native` | Good          | Use for binary settings only.                                                        |
| `Dialog` / `Sheet` | `Dialog`              | `Dialog`, `Sheet`   | Good          | Use modal/sheet by platform convention.                                              |
| `Avatar`           | `@baydar/ui-web`      | `@baydar/ui-native` | Good          | Both now use token-backed deterministic palettes.                                    |

## Screen Parity Rules

- Web can use multi-column app layouts at desktop breakpoints.
- Mobile remains one-column with bottom tabs and safe areas.
- Feature parity means the same user intent and states, not identical layouts.
- Every platform surface needs loading, empty, error, offline/retry, disabled, and success states where relevant.
- Settings screens without backend support render honest disabled/coming states, not fake saves.

## Current Known Gaps

- Native persistent `Alert` is not yet promoted; use `Banner`/`StateMessage` until three screens need it.
- Web shared `Skeleton` should be promoted if more screen-local skeletons are added.
- Large route files still need split passes before deeper visual polish:
  - `apps/mobile/app/(app)/onboarding.tsx`
  - `apps/web/src/app/[locale]/(app)/messages/page.tsx`
  - `apps/mobile/app/(app)/messages/[roomId].tsx`
  - `apps/web/src/app/[locale]/(app)/me/edit/page.tsx`
