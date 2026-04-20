# HANDOFF.md — current state + next steps

> Location: `docs/HANDOFF.md`.
> Read after `CLAUDE.md` and `DESIGN.md`. This tells you exactly where to start.

## What's done (design side)

- ✅ Brand name locked: **Baydar (بيدر)**. See `BRAND.md`.
- ✅ Token system rewritten (olive + terracotta, 5-surface hierarchy, 7-step type scale).
- ✅ Working interactive prototype covers 5 screens: Feed, Profile, Network, Messages, Search.
- ✅ 6 component specs written (Button, Avatar, Surface, PostCard, MessageBubble, AppShell).
- ✅ RTL rules documented.
- ✅ Mobile-specific overrides documented.
- ✅ Testing definition-of-done documented.

## What's done (code side)

- ✅ Turborepo monorepo scaffolded (`apps/web`, `apps/mobile`, `packages/ui-tokens`, `packages/ui-web`, `packages/ui-native`, `packages/api`, `packages/db`).
- ✅ `apps/web` boots (Next.js 15 App Router) with RTL `<html dir="rtl">`.
- ✅ Auth (Lucia), Prisma schema, basic feed/profile routes wired.
- 🟡 Token values are still the OLD generic-blue palette — **replace first thing** with files from `handoff/packages/ui-tokens/*`.
- 🟡 Components currently hardcode cards, no Surface variants, no avatars in many places.
- ⏳ Mobile app not started (folder exists, empty).

## What's NOT done

- ⏳ AppShell organism (web nav + mobile tabs).
- ⏳ Empty states + skeletons.
- ⏳ Mobile app (entire).
- ⏳ Final logo mark (placeholder in prototype, replace before launch).
- ⏳ Proper image uploads (+ blurhash).
- ⏳ Search filters beyond "people".
- ⏳ Jobs, Notifications screens.
- ⏳ Settings, billing, admin screens.

---

## Sprint plan — next 6 sprints

Each sprint = ~1 week of focused work. Order matters; don't skip ahead.

### Sprint 1 — Foundation swap (web) ✅ DONE

**Goal:** get the web app onto the new tokens + surface system. No new features.

1. ✅ Replace `packages/ui-tokens/src/index.ts` with the file from `handoff/`.
2. ✅ Regenerate `tokens.css` + `tokens.native.ts`.
3. ✅ Wire the Tailwind preset in `apps/web/tailwind.config.ts`.
4. ✅ Load IBM Plex Sans Arabic + Noto Naskh Arabic via `next/font/google` in `app/layout.tsx`.
5. ✅ Global search-replace any `bg-blue-*`, `text-slate-*`, raw hex in components → token class.
6. ✅ Build `<Surface>` atom in `packages/ui-web`. Replace every ad-hoc card in the app.
7. ✅ Build `<Avatar>` atom. Drop it into every place a person appears.
8. ✅ Run `pnpm lint:tokens` — green across web + mobile + ui-web.
9. ✅ Visual-QA every existing screen against the prototype. Gap list below feeds Sprints 2–4.

**Definition of done:** app looks like the prototype's olive aesthetic, even though features haven't changed.

#### Sprint 1 QA gap list (observed vs. prototype)

Things that *look* wrong today but are on the roadmap — not Sprint 1 fixes:

- **No AppShell.** Every `(app)` route has its own inline header with hand-rolled
  link buttons + a bell. Prototype has a sticky top nav with logo, rounded search
  pill, 5 nav items (home/network/jobs/messages/notifications), avatar dropdown.
  → Sprint 2.
- **Feed is a single 680px column.** Prototype is a 3-column grid (225 / 1fr / 300):
  left rail mini-profile hero with olive gradient, center column, right rail with
  "People you may know" + "Suggested jobs" + footer caption. → Sprint 3.
- **Composer is always expanded.** Prototype collapses to avatar + "Start a post…"
  pill + inline icon buttons, expands on click. → Sprint 3.
- **PostCard missing the reactions badge row.** Prototype shows an olive circle
  with a thumb icon + count, stats line ("N comments · N reposts"), divider, then
  a 4-button action bar (like / comment / repost / send) where each button grows
  `flex: 1`. Our card is: body → 3-button footer. → Sprint 3.
- **Messages thread has no bubble component.** Current implementation inlines
  `self-end bg-brand-600` for own messages, `bg-ink-muted/10` for other. Prototype
  wants a real `<MessageBubble>` with status ticks, time grouping, online dot on
  the header avatar. → Sprint 4.
- **No skeletons.** Every loading state is a "…" glyph. Prototype assumes skeleton
  shapes that match the real content. → Sprint 3/6.
- **Empty states are bare `<p>` tags.** Prototype expects title + description +
  primary action. → Sprint 6.
- **NotificationsBell icon is a custom inline SVG.** Once AppShell lands it will
  consume the shared `Icon` atom (not yet built). → Sprint 2.

Cosmetic-but-cheap items that *did* land in Sprint 1:

- Every surface routes through the 5-variant `<Surface>` atom (flat/card/hero/tinted/row).
- Every person uses `<Avatar>` (xs/sm/md/lg/xl, ring, online dot) on a deterministic
  token-backed palette.
- Brand olive + terracotta accent are the only colors; no Tailwind default palettes remain.
- Status chips ("online" in messages, "live" in notifications) use `success` token.
- Unread badges use `accent-600`; own-message bubbles use `brand-600` — the two
  signals no longer collide.

### Sprint 2 — AppShell + nav (web) ✅ DONE

1. ✅ Build `<AppShell>` per `docs/components/AppShell.md`.
2. ✅ Wrap every `(app)` route in it (new `apps/web/src/app/[locale]/(app)/layout.tsx`).
3. ✅ Make search input navigate to `/search` on keystroke.
4. ✅ Wire unread counts from Messages + Notifications (SSE, both streams).
5. ✅ Add `⌘K` / `Ctrl+K` search focus.
6. ✅ Profile menu dropdown: "View profile", "Settings", "Sign out".
7. ✅ Keyboard tab order audit (Tab through nav, ⬅/➡ rove RTL-aware,
   Home/End jump, ⬆/⬇ navigate open menu, Esc closes + returns focus).

**Landed in Sprint 2:**

- New atom `<Icon>` (exported from `@palnet/ui-web`) consolidates every inline
  SVG glyph — home / users / briefcase / message / bell / search / chevron-down /
  thumb / repost / send / check / x / more / plus / bookmark / logo. Always
  inherits `currentColor`, never ships a hex.
- New organism `<AppShell>` with 5 nav slots + profile menu + search pill.
  `aria-current="page"` on the active item, `aria-label` on the <nav> landmark,
  badges announce unread counts via an `sr-only` template (e.g. "3 رسائل غير
  مقروءة"). `focus-visible` ring on every interactive element.
- `(app)/layout.tsx` is the one place that fetches `/profiles/me`, subscribes
  to `/notifications/stream` and `/messaging/stream`, and keeps the badge
  numbers live. `/onboarding` is exempt (no shell before the user has a
  profile).
- Feed page stopped hand-rolling its cross-nav header (`NotificationsBell` +
  inline text links) — that responsibility lives in the shell now.
- New `nav.*` translations (ar + en) keep the shell free of hardcoded strings.

### Sprint 2 QA gap list (observed vs. prototype)

Things scoped for later sprints so Sprint 2 stays "chrome only":

- **Jobs screen is a 404.** The nav links to `/jobs` but the route doesn't
  exist yet. → Sprint 6.
- **Profile menu has no avatar hero inside the dropdown.** Prototype shows
  a compact me-card at the top of the menu (avatar + name + headline + "View
  profile" CTA). Today's menu is a plain list. → Sprint 3 (lands with the
  left-rail mini profile) or Sprint 6 polish.
- **Search debounce.** Every keystroke pushes the URL and triggers the search
  page's fetch. Acceptable because the search page already fetches on value
  change, but a 150ms debounce on the router push would cut churn. → Sprint 3
  or later.
- **Mobile top bar.** The spec calls for the web shell on ≥ md; small screens
  should collapse to tabs (per `docs/design/MOBILE.md`). Currently the web
  shell renders everywhere. → Sprint 5 when the mobile app lands.

### Sprint 3 — Feed polish

1. Build proper `<Composer>` (expand-on-click pattern from prototype).
2. Rebuild `<PostCard>` per spec.
3. Right rail: "People you may know" + "Suggested jobs".
4. Left rail: mini-profile card with hero gradient.
5. Empty state: "You don't follow anyone yet — see Network."
6. Skeleton cards during fetch.
7. Optimistic reactions.

### Sprint 4 — Messages

1. Build `<MessageBubble>` per spec (no CTA-color collision).
2. Thread grouping (runs of consecutive messages).
3. Status ticks (sending/sent/delivered/read/failed).
4. Online dot on avatars in room list.
5. Type-ahead indicator (debounced SSE).
6. Room list search.

### Sprint 5 — Mobile app kickoff

1. Expo app boots, fonts bundled, RTL forced.
2. Auth reuses `packages/api` endpoints.
3. Bottom tab AppShell with 5 items.
4. Port `<Avatar>`, `<Button>`, `<Surface>` to `packages/ui-native` — **same prop API as web**.
5. Feed screen mirrors web feed (single column).
6. Profile screen.
7. Messages screen with gesture back + swipe-to-archive rooms.

### Sprint 6 — Jobs + Notifications + polish

1. Jobs listing + job detail screens (web + mobile).
2. Notifications center with read/unread state.
3. Empty states + skeletons everywhere missing.
4. Accessibility pass (axe-core clean).
5. Arabic translation QA by native speaker.
6. Perf budget check.

---

## What Claude Code should NOT do

- ❌ Redesign anything. The prototype + DESIGN.md is the design. If you want to change a decision, ask the user — don't unilaterally "improve."
- ❌ Add features not on the sprint plan. Ship the boring thing first.
- ❌ Use any component from shadcn/ui / Radix themes without mapping it to our tokens first. Radix **primitives** (unstyled, headless) are fine; Radix **themed** components are not.
- ❌ Add dark mode. It's not designed yet.
- ❌ Add TypeScript `any` to get past a type error. If it's legitimately hard, ask.
- ❌ Add a new dependency without asking. Especially UI libraries.

## File-drop plan (paths to use when placing this package in the repo)

Copy these files from `handoff/` to these repo paths:

| From | To |
|---|---|
| `handoff/CLAUDE.md` | `CLAUDE.md` |
| `handoff/DESIGN.md` | `DESIGN.md` |
| `handoff/BRAND.md` | `BRAND.md` |
| `handoff/HANDOFF.md` | `docs/HANDOFF.md` |
| `handoff/packages/ui-tokens/src/index.ts` | `packages/ui-tokens/src/index.ts` |
| `handoff/packages/ui-tokens/src/tokens.css` | `packages/ui-tokens/src/tokens.css` |
| `handoff/packages/ui-tokens/src/tokens.native.ts` | `packages/ui-tokens/src/tokens.native.ts` |
| `handoff/packages/ui-tokens/tailwind-preset.ts` | `packages/ui-tokens/tailwind-preset.ts` |
| `handoff/docs/components/*.md` | `docs/components/*.md` |
| `handoff/docs/design/RTL.md` | `docs/design/RTL.md` |
| `handoff/docs/design/MOBILE.md` | `docs/design/MOBILE.md` |
| `handoff/docs/design/TESTING.md` | `docs/design/TESTING.md` |
| `handoff/docs/design/prototype/*` | `docs/design/prototype/*` |

After copying, delete the `handoff/` folder from this design project — it lives in the repo now.

## Final sanity check before starting Sprint 1

Run these commands. All must succeed:

```bash
pnpm install
pnpm tokens:build          # regenerates tokens.css + tokens.native.ts
pnpm --filter apps/web dev  # renders in olive palette, RTL, Arabic fonts loaded
open docs/design/prototype/PalNet\ Prototype.html  # visual reference still works
```

If any of those fail, fix them before writing a single new component.
