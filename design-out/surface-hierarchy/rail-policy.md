# Right-rail policy

The right rail is the second column on a desktop-width screen. It is **secondary discovery** — content the user might pivot to without leaving the page's verb. It is never:

- A duplicate of the main column.
- A fixed-position chat / help widget.
- A "this looks like a SaaS dashboard" stats card. Baydar is not a SaaS dashboard.

If the rail is empty for a given user, the rail does not render — the column collapses and the page goes wider. No "Coming soon" placeholders.

## Per-screen ruling

| Screen | Rail? | Contents | Why |
| --- | --- | --- | --- |
| **Feed** | yes — **two rails** | Left: mini-profile hero + connections count. Right: PYMK + suggested jobs. | Feed is the only screen where the user is actively *browsing*. The rails accelerate browsing — "who's in my orbit" + "what else can I do here". |
| **Network** | no | — | The page *is* discovery. A right rail would compete with the result list. Left rail filters are the only secondary surface. |
| **Jobs** | no | — | Same as Network. Left filters do the work; right is the result. Adding a "saved jobs" rail later means deferring this rule for that one rail — defer it. |
| **Messages** | no | — | Focus screen. Two-pane already (room list + thread). A third column would crowd a 1100-px max. |
| **Notifications** | no | — | Single-task read-once stream. |
| **Search** | no | — | Filters are inline tabs. Results are the page. |
| **Profile** (own + others) | no | — | Hero + tabs are the page. A "people also viewed" rail would lift LinkedIn directly — out per `BRAND.md`. |
| **Settings** | no | — | Routes do the work. |
| **Onboarding** | no | — | Bare shell, one verb. See `DESIGN.md §11.1`. |

## What goes in a feed rail

Each rail block is a `card` Surface with `padding="0"` and an internal header strip with a `See all →` link.

- **Left, top**: mini-profile `hero` Surface with the cover gradient. Hero is reserved for this use plus the profile page — don't promote a third surface to `hero`.
- **Left, bottom**: thin connections / followers summary (single line, link).
- **Right, top**: PYMK with up to 4 rows, each `Avatar + name + headline + Connect`.
- **Right, bottom**: up to 3 suggested job rows, each with company logo + title + meta.

If a rail block has zero items, it does not render. Don't show "No suggestions yet" inside the rail — let the column shrink.

## Mobile

No right rails. Single column, edge-to-edge cards, 64pt bottom tab bar. Rail content surfaces as inline blocks on the feed scroll (PYMK row, suggested-jobs row) at a future cadence — out of scope for this pass.

## When to revisit

Revisit this policy when:

- A new screen wants a right rail. Default: refuse unless the screen has clear *secondary discovery* (not a stats card, not a help widget).
- A rail block hits 3 use cases (PYMK on Feed, Profile, and one more) — at that point promote it to a shared component in `@baydar/ui-web`.
