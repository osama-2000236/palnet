# Open Design Screen Critique - Baydar

Updated: 2026-05-21

Source revision: Open Design `26ee030b4cfa340049ee2b338532a937aa4b90c1`.

Scale: 10 is excellent, 7 is the ship threshold. Dimensions map to Open Design as follows: philosophy, hierarchy, detail, functionality, restraint.

## Gate

- No production surface is accepted below 7 in any dimension.
- Scores are based on Baydar `DESIGN.md`, `docs/design/MOBILE.md`, `docs/design/RTL.md`, current route implementation, and the Open Design checklist pass.
- Backend-missing settings or security controls score through honest disabled/coming states, not fake saves.

## Web Routes

| Surface                                  | Route                                                   | Philosophy | Hierarchy | Detail | Functionality | Restraint | Notes                                                      |
| ---------------------------------------- | ------------------------------------------------------- | ---------: | --------: | -----: | ------------: | --------: | ---------------------------------------------------------- |
| Landing                                  | `/[locale]`                                             |          8 |         8 |      8 |             8 |         8 | Brand-first hero, warm surface, no fake metrics.           |
| Legal                                    | `/legal/*`                                              |          8 |         8 |      8 |             7 |         8 | Tokenized legal surface with readable long-form copy.      |
| Login                                    | `/login`                                                |          8 |         8 |      8 |             8 |         8 | Shared inputs, alerts, loading, disabled submit.           |
| Register                                 | `/register`                                             |          8 |         8 |      8 |             8 |         8 | Shared form primitives and validation error surface.       |
| Forgot/reset/verify                      | auth recovery routes                                    |          8 |         8 |      8 |             8 |         8 | Persistent success/error states plus toast feedback.       |
| App shell                                | `/(app)/layout`                                         |          8 |         8 |      8 |             8 |         8 | Compact search/nav shell, RTL-safe overflow recovery.      |
| Feed                                     | `/feed`                                                 |          8 |         8 |      8 |             8 |         8 | Field-row rhythm, composer, rails, no decorative gradient. |
| Network                                  | `/network`                                              |          8 |         8 |      8 |             8 |         8 | Filter chips, shared buttons, loading/error/empty states.  |
| Search                                   | `/search`                                               |          8 |         8 |      8 |             8 |         8 | Search-first form, tabs, no-results, retry, pagination.    |
| Notifications                            | `/notifications`                                        |          8 |         8 |      8 |             8 |         8 | Dense rows, dismiss recovery, skeletons, live badge.       |
| Messages                                 | `/messages`                                             |          8 |         8 |      8 |             8 |         8 | Room list, empty thread, send pending/failed/retry.        |
| Jobs list/detail/apply                   | `/jobs/*`                                               |          8 |         8 |      8 |             8 |         8 | Filters, job rows, apply states, retry/empty.              |
| Public profile                           | `/in/[handle]`                                          |          8 |         8 |      8 |             8 |         8 | Profile header and missing-profile handling.               |
| Self profile/edit/Karama                 | `/me/*`                                                 |          8 |         8 |      8 |             8 |         8 | Completion rail, forms, upload/save failures.              |
| Settings                                 | `/settings/*`                                           |          8 |         8 |      8 |             8 |         8 | Account, notifications, privacy, security, blocked states. |
| Employer home/new/company/job/applicants | `/employer/*`                                           |          8 |         8 |      8 |             8 |         8 | Operational density, shared form/actions, honest queues.   |
| Admin moderation/billing                 | `/(admin)/*`                                            |          8 |         8 |      8 |             8 |         8 | Dense review rows with loading, empty, error, actions.     |
| Localized error/not-found/loading        | `[locale]/error`, `[locale]/not-found`, segment loading |          8 |         8 |      8 |             8 |         8 | Route recovery and tokenized skeletons.                    |

## Mobile Routes

| Surface                     | Route                          | Philosophy | Hierarchy | Detail | Functionality | Restraint | Notes                                                        |
| --------------------------- | ------------------------------ | ---------: | --------: | -----: | ------------: | --------: | ------------------------------------------------------------ |
| App root/auth gate          | `app/_layout`, `app/index`     |          8 |         8 |      8 |             8 |         8 | Safe areas, warm token canvas, session recovery.             |
| Bottom tabs                 | `(app)/_layout`                |          8 |         8 |      8 |             8 |         8 | Five focused tabs, hidden detail routes, badge behavior.     |
| Auth stack                  | `(auth)/*`                     |          8 |         8 |      8 |             8 |         8 | Native form scaffold, offline errors, disabled submit.       |
| Onboarding                  | `(app)/onboarding`             |          8 |         8 |      8 |             8 |         8 | Progress, validation, safe-area one-column layout.           |
| Feed/composer               | `(app)/feed`, `(app)/composer` |          8 |         8 |      8 |             8 |         8 | FlatList, refresh, composer entry, haptic commit.            |
| Network                     | `(app)/network`                |          8 |         8 |      8 |             8 |         8 | Segmented filters, pending actions, haptics, retry.          |
| Search                      | `(app)/search`                 |          8 |         8 |      8 |             8 |         8 | Search field, tabs, mixed-direction input, empty/error.      |
| Notifications               | `(app)/notifications`          |          8 |         8 |      8 |             8 |         8 | Pull refresh, swipe dismiss, restoration on failure.         |
| Jobs                        | `(app)/jobs/*`                 |          8 |         8 |      8 |             8 |         8 | Native filter sheet, FlatList, apply detail state.           |
| Messages                    | `(app)/messages/*`             |          8 |         8 |      8 |             8 |         8 | List/thread split, keyboard-safe composer, failed send.      |
| Profile/self-profile/Karama | `(app)/in/*`, `(app)/me/*`     |          8 |         8 |      8 |             8 |         8 | Header sections, edit forms, empty profile sections.         |
| Settings                    | `(app)/settings/*`             |          8 |         8 |      8 |             8 |         8 | Account, notification, privacy, security, blocked states.    |
| Employer workspace          | `(app)/employer/*`             |          8 |         8 |      8 |             8 |         8 | AppHeader, RecordCard, skeleton, empty, error, status chips. |

## Follow-up Watchlist

- Add richer copy for admin and employer empty states when product messaging is finalized.
- Expand automated screenshot coverage beyond the settings smoke captures to the full route matrix.
- Replace remaining route-local textareas/selects with shared primitives once those primitives are specced.
