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

- screen: feed
  area: right-rail / quick-access
  problem: "وصول سريع" panel surfaces 3 links (المحفوظات/مجموعاتي/الفعاليات) — none are MVP features per `HANDOFF.md`. Still aspirational chrome.
  severity: med

- screen: feed
  area: footer
  problem: Left-rail "بيدر · 2026" tiny mid-rail. No link, no purpose. Looks afterthought.
  severity: low

- screen: messages
  area: empty thread pane
  problem: "اختر محادثة لبدء القراءة." centered in vast empty pane. No illustration, no recent contact suggestions, no compose CTA in body.
  severity: med

- screen: notifications
  area: empty
  problem: Per `DESIGN.md §12` mandate, every empty state needs illustration + recoverable action. Still missing.
  severity: med

- screen: onboarding
  area: shell
  problem: Bare onboarding (no AppShell). Per layout `isBareAppRoute()` — intentional. Document the decision in `DESIGN.md` OR restore shell.
  severity: med

- screen: all (system)
  area: surface variants
  problem: "Every section as `card`" anti-pattern partially survives. Right-rail consistency still uneven (feed has 2 rails, jobs 1, network/notifications/settings 0).
  severity: med

- screen: header
  area: avatar dropdown
  problem: "AT" avatar + "ملفي" + chevron — chevron implies dropdown but tap target unclear. Current snapshots show `?` avatar instead of "AT" — looks broken/loading. Investigate.
  severity: low

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
