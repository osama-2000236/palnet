# AppShell

> Location: `docs/components/AppShell.md`.
> Source: `packages/ui-web/src/AppShell.tsx` (web) + `packages/ui-native/src/AppShell.tsx` (mobile tabs).

## What it is

The persistent chrome wrapping every authenticated screen.

- **Web**: sticky top bar with logo · search · nav icons · profile menu.
- **Mobile**: bottom tab bar with 5 items; title bar is per-screen, not global.

## Web top bar

Height `56px` (`--nav-h`). Max width `--max-w` (1128). Sticky, `z-index: 20`.

| Slot         | Width         | Content                                                   |
| ------------ | ------------- | --------------------------------------------------------- |
| Logo (start) | 120           | Mark + wordmark "بيدر"                                    |
| Search       | 320 (max 38%) | Pill input, `surface-subtle` bg, magnifier icon           |
| Flex gap     | 1fr           | —                                                         |
| Nav icons    | auto          | 5 items: الرئيسية · شبكتي · الوظائف · الرسائل · الإشعارات |
| Divider      | 1             | Vertical `line-soft`                                      |
| Profile menu | auto          | Avatar `sm` + "ملفي ▾"                                    |

Each nav item: column layout (icon above label), 11px label, `brand-600` underline when active, `accent-600` dot badge for unread count.

## Mobile bottom tabs

Height `64pt` (`--mobile-tab-h`) + safe-area inset. 5 items:

| #   | Icon    | Label (ar)            | Route    |
| --- | ------- | --------------------- | -------- |
| 1   | home    | الرئيسية              | Feed     |
| 2   | users   | شبكتي                 | Network  |
| 3   | plus    | (elevated, FAB-style) | Composer |
| 4   | message | الرسائل               | Messages |
| 5   | user    | ملفي                  | Profile  |

- Center item (post composer) is raised 8pt above the bar with `brand-600` bg and white icon — not a plain tab.
- Active tab: `ink` color + `brand-600` 3px underline; inactive: `ink-muted`.
- Search lives on the Feed screen's header, not in the tab bar.
- Notifications move into the Feed screen's header (bell icon) on mobile.

## Behavior

- **Keyboard navigation** (web): Tab through nav items; `Enter` / `Space` activates; arrow keys move between items.
- **Current route highlight**: exact match on route prefix. `/network/invites` highlights `شبكتي`.
- **Search focus**: `⌘K` / `Ctrl+K` focuses the pill; on mobile, tapping the search area opens the Search screen directly.
- **Unread badges**: numeric if ≤ 99, else `99+`. Dot only when exact count unknown.

## RTL

- Logo on the **start** side (right in RTL).
- Nav icons on the **end** side (left in RTL).
- Search input caret, placeholder, and value direction: follow user input. When empty, `direction: rtl`.

## Accessibility

- `<header role="banner">` web; `<nav>` wraps nav items.
- Each nav item has `aria-current="page"` when active.
- Badge counts announced: `aria-label="3 رسائل غير مقروءة"`.
- On mobile, FAB-style compose has `accessibilityLabel="إنشاء منشور"`.

## Anti-patterns

- ❌ A hamburger menu on web. We have the room — use top nav.
- ❌ Showing the logo + wordmark on mobile tabs — tabs are icons only (+ tiny labels).
- ❌ More than 5 tabs. Demote less-used items into a "More" sheet.
- ❌ Hiding the bottom tab bar on scroll (common dark pattern, hurts orientation).
