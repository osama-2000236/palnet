# Handoff back to Claude Design — 2026-05-16

Source bundle reviewed: `16-5-2025-design-upgrades/` (Journey & Dead Ends, Missing Elements UI Kit, Product Health Report).

The bundle delivered:

- ✅ Full source for `/settings/notifications` (drop-in `.tsx`, all states, ar copy).
- ✅ Product Health Report mapping 15 missing screens + 24 implementation risks.
- ✅ Journey map identifying 8 dead ends.

**Below: design work still owed before engineering can finish the Sprint plan in Product Health Report §5.**

---

## A. Missing screen designs (no mock exists)

Engineering can build all of these once specs land. Same fidelity as `/settings/notifications` preferred: HTML preview + token-bound styles + ar copy + state coverage (zero / loading / error / unauth).

| #   | Route                                   | Why needed                                                                             | Spec gaps to fill                                                                                                                            |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/me` (self profile view)               | Currently only `/me/edit` + `/me/karama` exist. No discoverable self-view from chrome. | Header w/ avatar/cover/headline, edit-CTA placement, completion ring, tab structure (Posts/About/Karama), how it differs from `/in/[handle]` |
| 2   | `/me/connections`                       | `/network` shows suggestions only. No list of accepted connections.                    | List layout (rows vs grid), filter chips, search-within, remove-connection affordance, pending-tab vs accepted-tab                           |
| 3   | `/settings/privacy`                     | GDPR/compliance gate.                                                                  | Profile visibility matrix (public / connections / private), who-can-message rules, connections-visible-to, search-indexable toggle           |
| 4   | `/settings/security`                    | Password change + 2FA later. `account` only covers email/handle.                       | Password change form (current + new + confirm), session list w/ revoke, 2FA placeholder card, login alerts toggle                            |
| 5   | `/saved` (bookmarks)                    | Bookmark icon ships in `Icon.tsx` w/ no route. Used as dead filler in PostCard.        | Layout (list of saved posts), empty state copy, filter by type (post / job / profile), unsave action                                         |
| 6   | `/employer/[slug]/billing`              | Per-org billing surface (global `(admin)/billing` exists only).                        | Plan card, seats counter, invoice history, payment method, downgrade flow                                                                    |
| 7   | Marketing landing rebuild (`/[locale]`) | Currently single H1 + Register button. No "Sign in" path. Won't convert paid traffic.  | Hero (Arabic-first, RTL), value props x3, employer track section, social proof slot, footer, both Register+Sign-in CTAs                      |
| 8   | Onboarding success / celebration        | `/onboarding` drops straight into `/feed` w/ no completion moment.                     | Single-frame celebration screen, primary action → feed, skippable, Arabic copy                                                               |

## B. Missing UI states (screens exist but states missing)

| #   | Screen                        | State to design                                                                                                                                                   |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | `/feed`                       | Error state (rails + main timeline) + retry — pixel-level. Bundle says "infinite empty"; need designed error Surface w/ illustration matching `EmptyState` family |
| 10  | `/network`                    | API failure state + connect/decline mutation error toast pattern                                                                                                  |
| 11  | `/notifications`              | Bell badge state when API fails. SSE-dropped indicator.                                                                                                           |
| 12  | `/messages`                   | Failed-send retry chip on message bubble                                                                                                                          |
| 13  | `/search`                     | "No results" vs "search broke" — must be visually distinct                                                                                                        |
| 14  | `/in/[handle]`                | NotFound boundary (invalid handle) with chrome — not raw Next 404                                                                                                 |
| 15  | `/onboarding`                 | Persistent step-save error (not 2s auto-clear)                                                                                                                    |
| 16  | Global `error.tsx`            | Page-level error boundary illustration + copy + "Try again" + "Go home"                                                                                           |
| 17  | Global `not-found.tsx`        | 404 page with chrome, illustration, search + home links                                                                                                           |
| 18  | Global `(app)/loading.tsx`    | Skeleton shell matching AppShell — not blank                                                                                                                      |
| 19  | Session-expired re-auth modal | Soft-401 modal pattern, password re-entry, "stay signed in" copy                                                                                                  |
| 20  | Offline / network banner      | Global banner pattern (web + Expo). Persistent vs toast. Connection-restored toast.                                                                               |

## C. Component atoms still owed by UI Kit

Bundle delivered `Switch` inlined in the page. Following atoms still need design + tokens:

| #   | Atom                                     | Used by                              | Needed for                                                                                                   |
| --- | ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 21  | `Switch` (final)                         | notifications page (inlined)         | Hoist to `@baydar/ui-web` + `@baydar/ui-native`. Need rest/focus/disabled/loading + RTL thumb direction spec |
| 22  | `Dialog` / `Modal`                       | session-expired, confirm destructive | Focus trap, return-focus, RTL spec, dismissible vs blocking                                                  |
| 23  | `Banner` (offline / system)              | global online status                 | Persistent variant, dismissible, position (top of AppShell), z-index, mobile reflow                          |
| 24  | `RetryChip`                              | message bubble failed-send           | Inline within bubble, color + icon spec, tap target                                                          |
| 25  | `OnboardingProgress` celebration variant | onboarding success                   | Confetti? Static? Animation token decision needed                                                            |
| 26  | `Skeleton` family                        | profile + messages + search          | `PostCardSkeleton` exists only. Need `ProfileSkeleton`, `RoomListSkeleton`, `SearchResultSkeleton`           |

## D. Design-system token gaps (Product Health Report §3)

Engineering can emit these to `tokens.css` once design confirms values:

| Token                                                              | Status                  | Decision needed                                                                            |
| ------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------ |
| `--space-0..--space-24`                                            | In TS only, not CSS     | Confirm scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64?)                                       |
| `--success-soft`, `--warning-soft`, `--danger-soft`, `--info-soft` | Referenced, not defined | Bundle uses 8–10% alpha — confirm canonical values                                         |
| `--focus-ring` + `--focus-ring-offset`                             | Per-page ad-hoc         | Confirm `0 0 0 2px var(--brand-500)` w/ 2px offset                                         |
| `--shadow-nav`, `--shadow-modal`                                   | Missing                 | Need elevation tokens beyond `card`/`pop`                                                  |
| `--avatar-palette-{1..5}-bg/-fg`                                   | In Avatar.tsx JS only   | Hoist to CSS vars                                                                          |
| `--bp-sm: 640px`                                                   | Missing                 | Confirm — currently `md/lg/xl` only                                                        |
| Numeral direction utility                                          | None                    | LTR-numerals-inside-RTL — need `<bdi>` wrapper convention or `--numeral-direction` CSS var |
| Dark mode                                                          | Not designed            | Confirm out-of-scope for v1                                                                |
| Data-viz palette                                                   | Missing                 | Defer until first chart (Karama, employer applicant stats)                                 |

## E. Copy / content gaps

| #   | Need                                    | Locale set                                                                                                                                   |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 27  | Notification preferences ar-PS variants | `ar-PS.json` needs full `settings.notifications.*` block + `errors.*` + `common.{retry,revert,save,saving}` mirrored from bundle's `ar.json` |
| 28  | All new screens (A.1–A.8)               | ar / en / ar-PS triplets                                                                                                                     |
| 29  | All new error states (B.9–B.20)         | ar / en / ar-PS                                                                                                                              |
| 30  | Settings landing row (notifications)    | ar / en / ar-PS — `items.notifications` + `items.notificationsDesc`                                                                          |

## F. Priority for design platform

Ranked by engineering blockage:

1. **B.16/B.17/B.18** — error/404/loading shells (blocks P0 boundary work)
2. **A.7** — marketing landing (blocks launch; has hard launch dependency)
3. **A.3 + A.4** — privacy + security settings (compliance dependency)
4. **A.1 + A.2** — self-profile + connections list (Journey dead-end fix #1)
5. **C.22 + C.23 + B.19 + B.20** — Dialog/Banner + session-expired + offline (UX resilience)
6. **A.8 + A.5 + A.6** — onboarding celebration, /saved, employer billing

---

## Notes for design platform

- Reuse the **Journey & Dead Ends.html** HTML/CSS prototype style for any new screen mocks.
- All Arabic strings use `dir="rtl"` body wrapper; use `start`/`end` logical CSS only (no `left`/`right`).
- Tokens-first: every color/spacing/radius bound to `var(--*)` from `packages/ui-tokens/src/tokens.css`.
- No Tailwind default blue — brand is olive.
- Mobile twins of any new web component must ship in same handoff (web + native parity).
- Source code blocks at the level of `/settings/notifications/page.tsx` (full state coverage, drop-in, ar copy inline) are the gold standard — same format please.
