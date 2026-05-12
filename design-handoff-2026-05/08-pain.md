# Pain Inventory — v2 (post-bug-fix walk)

> **Source:** AI walkthrough of 8 web screen snapshots (desktop-ar-PS) at `04-screens/{screen}/web/` after fixing bugs 0-3.
> v1 was based on broken-state snapshots (settings 404, search untranslated, jobs raw error). v2 reflects current real state.

## Bugs fixed since v1

All 4 launch-blocking bugs in `BUGS-PRECONDITIONS.md` resolved:

- ✅ `/settings` 404 → landing page.
- ✅ Search raw i18n keys → Arabic tabs.
- ✅ Jobs raw `API 403` → friendly + redirect to onboarding.
- ✅ Dev `1 error` / `7 errors` overlays gone across all screens.

## Surviving design problems (from v1, still real)

- ~~feed quick-access aspirational links~~ — **fixed** (removed in this round; re-add real card per feature when shipping).

- ~~feed footer "بيدر · 2026" mid-rail~~ — **fixed** (removed in this round).

- ~~messages empty thread bare prompt~~ — **fixed** (icon + prompt + compose CTA linking to `/messages/new`; full empty-state illustration deferred to design pass).

- screen: notifications
  area: empty
  problem: Per `DESIGN.md §12` mandate, every empty state needs illustration + recoverable action. Still missing illustration; current state has `✓` glyph + copy only. Defer to design pass.
  severity: med

- ~~onboarding shell decision~~ — **fixed** (documented in `DESIGN.md §11.1`: bare shell intentional because every other tab 403s with `PROFILE_ONBOARDING_REQUIRED` until the form completes).

- screen: all (system)
  area: surface variants
  problem: "Every section as `card`" anti-pattern partially survives. Right-rail consistency still uneven (feed has 1 rail now after quick-access removal, jobs 1, network/notifications/settings 0). Defer to design pass.
  severity: med

- screen: header
  area: avatar dropdown
  problem: "AT" avatar + "ملفي" + chevron — chevron implies dropdown but tap target unclear. Defer to design pass.
  severity: low

- ~~notifications read/unread hierarchy~~ — **already fixed** (false positive in v1 walk; `notifications/page.tsx` already styles unread rows with `border-brand-500/30 bg-brand-50` vs read `border-ink-muted/20 bg-surface`).

## NEW problems found in v2 walk

- screen: feed
  area: mini-profile hero (right rail top)
  problem: Olive header band + circular `?` avatar inside hero card. Profile name + headline missing. Looks like loading-state stuck or auth fixture incomplete. Investigate: hero needs proper empty state OR profile fetch needs fallback rendering.
  severity: med

- screen: network
  area: body
  problem: Tabs render correctly (علاقاتي / الدعوات / المُرسلة) but body region is **completely empty** — no list, no empty state, no skeleton. Previous "لا يوجد شيء هنا بعد." gone. Net regression.
  severity: high

- screen: network
  area: floating artifact
  problem: Bare `...` element rendering mid-screen near tabs. Likely an overflow-menu trigger that lost its context. Visual debt.
  severity: low

- screen: messages
  area: right-rail header
  problem: 3 elements crammed: title الرسائل + `+` icon + search input. Visual hierarchy weak — `+` and title compete.
  severity: low

- screen: feed
  area: composer state
  problem: Composer avatar shows `?` placeholder when profile unloaded. Loading-state for composer not designed; renders broken.
  severity: low

- screen: notifications
  area: hierarchy
  problem: Skeleton list shows 4 identical rows. When populated, no visible variant between read/unread (per code review). Hierarchy weak.
  severity: med

## v1 items that turned out to be artifacts of broken state

These looked like design problems but were actually side-effects of bugs 1-3:

- ~~Search results pane oversized placeholder~~ — was rendering above the missing-key error. Now correct after Arabic tabs.
- ~~Jobs raw error display~~ — fixed by Bug 3.
- ~~Settings 404 → 404 page screenshot~~ — fixed by Bug 1.
- ~~"7 errors" / "1 error" overlay on most screens~~ — fixed by Bug 4 cascade.

## Mobile

Still `[HUMAN]` — no simulator captures. See `04-screens/MOBILE-SNAPSHOTS.md` for runbook.

## Severity summary

| sev  | count | items                                                                                                                              |
| ---- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| high | 1     | network body empty                                                                                                                 |
| med  | 7     | feed quick-access, messages empty, notifications empty + hierarchy, onboarding shell decision, surface variants, feed hero loading |
| low  | 4     | feed footer, header avatar, network floating dots, messages rail crammed, composer placeholder                                     |

## Lead additions (AI-assisted; lead review pending)

- screen: feed
  area: dev-status badge
  problem: A red `1 error` badge is still visible in the lower-left corner, so the refreshed snapshot still carries debugging chrome into the design handoff.
  severity: high
  snapshot: 04-screens/feed/web/desktop-ar-PS-default.png

- screen: feed
  area: mobile top navigation
  problem: The full desktop navigation is squeezed into the mobile viewport, making the icon row and search affordance feel cramped instead of switching to a mobile navigation pattern.
  severity: high
  snapshot: 04-screens/feed/web/mobile-en-default.png

- screen: jobs
  area: empty state
  problem: The no-results state is a thin muted strip with no title, illustration, or recovery action, so the largest content area reads as abandoned.
  severity: med
  snapshot: 04-screens/jobs/web/desktop-en-default.png

- screen: jobs
  area: filters
  problem: Desktop filters carry many tiny pill controls with equal visual weight, but the mobile capture drops that filtering affordance entirely instead of offering a compact filter entry point.
  severity: med
  snapshot: 04-screens/jobs/web/mobile-ar-PS-default.png

- screen: messages
  area: mobile layout
  problem: The desktop two-pane inbox survives on mobile, leaving a narrow conversation list and a compressed empty-state panel rather than a stacked mobile reading flow.
  severity: high
  snapshot: 04-screens/messages/web/mobile-en-default.png

- screen: network
  area: empty state
  problem: The network page has tabs and a bare "Nothing here yet" row only; it lacks the illustration, explanatory copy, and connect action expected for a relationship-building screen.
  severity: high
  snapshot: 04-screens/network/web/tablet-en-default.png

- screen: notifications
  area: empty state
  problem: The empty state relies on a checkmark glyph inside a tinted card and does not offer a recoverable action or richer illustration, so the page has almost no design signal.
  severity: med
  snapshot: 04-screens/notifications/web/desktop-ar-PS-default.png

- screen: onboarding
  area: first-run form
  problem: The onboarding form is a bare centered stack with no progress, product context, or shell decision visible, making the first-run path feel like a generic settings form.
  severity: high
  snapshot: 04-screens/onboarding/web/desktop-ar-PS-default.png

- screen: search
  area: mobile search controls
  problem: The search input, submit button, and result-type tabs compress into a small horizontal cluster on mobile, leaving the primary task visually secondary to surrounding whitespace.
  severity: med
  snapshot: 04-screens/search/web/mobile-ar-PS-default.png

- screen: auth-register
  area: terms consent row
  problem: The consent checkbox and legal copy are very small and visually detached from the primary CTA, which weakens the trust moment in account creation.
  severity: low
  snapshot: 04-screens/auth-register/web/mobile-en-default.png
