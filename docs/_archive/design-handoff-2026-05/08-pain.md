# Pain Inventory — v3 (Sprint 27 re-verification, 2026-07-02)

> **v3 status:** code re-verified against `main` after Sprints 22–26 + the Open Design implementation pass. Most v2 items are RESOLVED in code. v2 kept below as history.

## Resolved since v2 (verified in code, 2026-07-02)

- **Empty states everywhere:** `EmptyState` (illustration + title + body + CTA, harvest motif) is consumed by 15 web routes — feed, network, notifications, messages (inbox/room/list), search, jobs, saved, activity, settings/blocked, moderation, billing, app error. Native twin exists. v2 items "notifications empty", "network body empty", and the `DESIGN.md §12` gap are closed.
- **Surface hierarchy:** `docs/design/SCREENS.md` is a real per-screen recipe matrix (no longer a stub); every route was scored ≥8/10 in `docs/_archive/design-2026-05/open-design-screen-critique.md` (2026-05-21).
- **Onboarding:** progress component shipped (`OnboardingProgress`, web + native); bare-shell decision documented.
- **Dark mode:** warm-dark theme shipped (`ab981a0`); light/dark semantic token contract live on web + mobile.
- **Feed hero / composer `?` avatar:** snapshot-era auth-fixture artifacts; profile fallbacks render via shared atoms now.

## Still open (v3)

- **Mobile snapshots:** still `[HUMAN]` — needs simulator run per `04-screens/MOBILE-SNAPSHOTS.md`.
- **Moodboard captures:** still `[HUMAN]`.
- **Post-critique surfaces never walked:** `/me/premium` + checkout flow, `/saved`, public company route, karama-payment — shipped after the 2026-05-21 critique, no pain walk or critique scores exist for them. This is the v3 pain-walk gap and the core of the Pass 2 ask (`10-ask.md`).
- **Operator UX on `/moderation` + `/billing`:** correctness hardened (Sprint 25) but never operator-walked or design-reviewed.

---

# Pain Inventory — v2 (post-bug-fix walk) [HISTORY]

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

## Lead additions

[HUMAN: lead adds findings from manual walk + mobile inspection]
