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

Things that _look_ wrong today but are on the roadmap — not Sprint 1 fixes:

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

Cosmetic-but-cheap items that _did_ land in Sprint 1:

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

- New atom `<Icon>` (exported from `@baydar/ui-web`) consolidates every inline
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

### Sprint 3 — Feed polish ✅ DONE

1. ✅ Shared `<Composer>` in `packages/ui-web` — two-state (collapsed pill
   with 3 quiet icon chips; expanded avatar + name + autoFocus textarea +
   media tray + char counter + submit). Web host owns upload + post.
2. ✅ Shared `<PostCard>` in `packages/ui-web` — header with Avatar md +
   name + headline + time + audience line + `…` menu, body at 15/1.7,
   media grid, stats row with olive thumb badge, divider, 4-button
   action bar (like/comment/repost/send, `flex-1` each), and a
   `commentsSlot` the host mounts the existing Comments region into.
3. ✅ Shared `<PostCardSkeleton>` matching the card layout — rendered
   while the first page of `/feed` is fetching.
4. ✅ Backend: `GET /connections/suggestions?limit=N` → returns
   `{ data: PersonSuggestion[] }`. Excludes every userId the viewer
   already has any connection row with. `PersonSuggestion` now lives
   in `packages/shared/src/schemas/connection.ts` so the mobile app
   can reuse the exact same shape in Sprint 5.
5. ✅ Feed page rewritten as `225 / 1fr / 300` grid on `lg:`; collapses
   to a single column below. Left rail = mini-profile hero (olive
   gradient + ringed lg avatar + headline). Right rail = PYMK list
   (first 4) + "Suggested jobs (قريبًا)" placeholder + footer caption.
6. ✅ Empty state — tinted surface with home glyph + title + description,
   replaces the old flat one-liner.
7. ✅ Optimistic reactions — unchanged logic, now running inside the
   shared PostCard shell via `onToggleReaction` + `busy` prop.

**Landed in Sprint 3:**

- `packages/ui-web/src/Composer.tsx` + `PostCard.tsx` + `PostCardSkeleton.tsx`
- `packages/shared/src/schemas/connection.ts` — `PersonSuggestion` schema
- `apps/api/src/modules/connections/*` — `suggestions()` + controller route
- `apps/web/src/app/[locale]/(app)/feed/page.tsx` — 3-col layout + rails
- `apps/web/src/components/{Composer,PostCard}.tsx` — thin host wrappers
- `apps/web/messages/{ar-PS,en}.json` — `post.*`, `feed.rail.*`, `composer.*`

#### Sprint 3 QA gap list (observed vs. prototype)

Things scoped for later sprints so Sprint 3 stays "feed-only":

- **Left-rail connection count is a placeholder `—`.** The card fetches
  `me` but not `/connections/counts`; the prototype shows "الاتصالات · 142".
  Cheap to add — one `apiFetch("/connections/counts", ...)` in the same
  effect. → Sprint 6 polish.
- **PYMK "Connect" button navigates to the profile instead of sending a
  request inline.** The backend already has `POST /connections`, but a
  one-click connect flow needs a confirm modal per the Network spec.
  → Sprint 6.
- **Suggested jobs is literally a "قريبًا" card.** Jobs ships Sprint 6.
- **No comments pagination in the Comments slot.** The existing
  `<Comments>` component handles it; verified still works — but the
  tinted comments region could use a compact scroll container when the
  list grows past ~6. → Sprint 6 polish.
- **PostCard timestamp is `toLocaleString()`** — prototype wants relative
  ("قبل ٣ ساعات") with absolute on hover. → Sprint 6.
- **Repost + Share actions are no-ops.** Per spec the handlers exist on
  the shared shell; host wiring lands with repost composer. → Sprint 6.

### Sprint 4 — Messages ✅ DONE

1. ✅ Build `<MessageBubble>` per spec (no CTA-color collision — mine uses `brand-100` fill, never `brand-600`).
2. ✅ Thread grouping (runs of consecutive messages; 2-min window, 10-min gap-before triggers timestamp).
3. ✅ Status ticks (sending/sent/delivered/read/failed) — pragmatic mapping: pending client id → sending, other's `lastReadAt >= createdAt` → read, else sent. Delivered enum reserved for future receipts.
4. ✅ Online dot on avatars in room list (2-min `lastSeenAt` threshold).
5. ✅ Type-ahead indicator — 3s outgoing throttle, 5s client-side TTL, fanout via `POST /messaging/rooms/:id/typing` + SSE `typing` event (no persistence).
6. ✅ Room list search — client-side filter over firstName/lastName/handle/title/lastMessage.body.

#### Sprint 4 QA gap list (deferred to Sprint 6)

- **No message edit/delete.** Spec doesn't call for either in v1.
- **No media in messages.** `mediaUrl` field exists in the DTO; no upload path or renderer yet.
- **No group rooms.** `isGroup` + `title` exist on `ChatRoom` but creation UX + member management are not built.
- **No jump-to-unread scroll.** Thread opens at the newest message; we don't scroll to the first unread.
- **No read-receipt per-recipient list for groups.** Single `lastReadAt` per member is stored; UI picks "the other" member in DMs only.
- **Typing indicator is server-ephemeral.** If a tab reconnects mid-burst, it misses the in-flight event. Acceptable for v1.
- **`lastSeenAt` is not bumped by this app yet.** The column exists; wiring a heartbeat on SSE-connect is a Sprint 6 task.

### Sprint 5 — Mobile app kickoff 🟡 IN PROGRESS

1. ✅ Expo app boots with IBM Plex Sans Arabic + Noto Naskh Arabic bundled via `@expo-google-fonts`; RTL forced at root via `I18nManager.forceRTL`.
2. ✅ Auth wires to `packages/api` (pre-existing; unchanged this sprint).
3. ✅ Bottom-tab AppShell — 5 tabs (feed · network · messages · notifications · search). Non-tab routes (composer, onboarding, me/edit, in/[handle]) render via `href: null` so they push without showing a tab.
4. ✅ `packages/ui-native` scaffolded with `Avatar`, `Button`, `Surface` — prop APIs mirror ui-web (same variants, same sizes, `onClick` → `onPress`). Canonical web `Button` also landed alongside.
5. 🟡 Feed screen dogfooded with `Surface` + `Avatar` + token-styled text; `PostRow` now uses the shared atoms. Other screens still on inline ad-hoc styling — port as needed in Sprint 6.
6. ⏳ Profile screen not yet ported to ui-native atoms (still inline).
7. ⏳ Messages screen not yet ported (still inline, no swipe-to-archive).

#### Sprint 5 QA gap list (deferred / deliberate debt)

- **Other mobile screens (messages, network, search, notifications, onboarding, me/edit, in/[handle]) still use raw RN primitives + nativewind classes.** Port to `Surface` / `Avatar` / `Button` incrementally.
- **Tab icons are emoji stubs.** Port the web `Icon` atom to `ui-native` and replace the `TabGlyph` text nodes.
- **Swipe-to-archive on room rows** not implemented (needs `react-native-gesture-handler` + a `Swipeable` wrapper).
- **Messages → thread uses the default push animation** (tab bar stays visible). Standard mobile pattern is "modal-like" presentation that hides the tab; revisit if users complain.
- **`lint:tokens` now scans `apps/mobile/app` + `packages/ui-native/src`** too — any new hex in those trees fails the check.
- **Font loading blocks on a blank `surfaceMuted` view** instead of a proper splash with the Baydar mark. Logo art is still a placeholder anyway.
- **Mobile still uses `nativewind` for existing screens.** ui-native atoms deliberately use React Native `StyleSheet` + `nativeTokens` so the package stays framework-agnostic; nativewind remains available to host code.

### Sprint 6 — Jobs + Notifications + polish ✅ SHIPPED

1. ✅ **Jobs API** — `GET /jobs` (cursor paginated, `q`/`city`/`type`/`locationMode` filters, case-insensitive `contains`), `GET /jobs/:id` (DTO includes `viewer.hasApplied` + company basics), `POST /jobs/:id/apply` (idempotent via `@@unique(jobId, applicantId)` — re-press returns existing row).
2. ✅ **Web jobs listing** at `/jobs` — filters aside (search, city, type chips, location chips) with debounced (250ms) refetch, skeleton on first load, empty state with brand glyph, applied badge on rows.
3. ✅ **Web job detail** at `/jobs/[id]` — hero `Surface` with logo + title + company link + meta + salary, description section, skills chips. Apply button is the canonical `ui-web/Button accent` with optimistic `hasApplied` flip + rollback on error.
4. ✅ **Mobile jobs tab** — `/(app)/jobs/index.tsx` (paginated list, skeleton, empty state, applied badge) and `/(app)/jobs/[id].tsx` (hero, description, skills, optimistic apply). Bottom tabs expanded to six entries.
5. ✅ **ui-native `Icon` atom** — same `IconName` union as web, 24×24 viewBox, react-native-svg host. Tab-bar emoji glyphs replaced with real icons (home, users, briefcase, message, bell, search); focused tab gets a heavier stroke instead of a filled variant.
6. ✅ **`jobs.*` i18n namespace** (title, filters, search, city, type/locationLabels, appliedBadge, description, skills, empty/notFound copy, countSummary, from/upTo) added to both web catalogs (en + ar-PS) and mobile catalogs (en + ar) matching the shared `JobType` / `JobLocationMode` enum values.
7. ✅ **Notifications polish** — first-load skeleton (4 rows) + friendly tinted empty state with brand checkmark. Stops the "empty card flash" on open.
8. ✅ **Feed right-rail jobs** — replaces the `قريبًا` placeholder with a live mini-list backed by `/jobs?limit=3`. Falls back to the placeholder copy when the endpoint returns empty.
9. ✅ **Search skeleton** — four pulsing person rows while the first query is in flight. Prevents the empty-state copy flashing between submit and first response.
10. ✅ **Mobile profile ported** to `Surface` / `Avatar` / `Button` from `@baydar/ui-native`. Same connection matrix, same optimistic updates; styling now flows through `nativeTokens` instead of nativewind class strings.
11. ✅ **Shared i18n formatters** in `@baydar/shared` — `formatNumber`, `formatCurrency`, `formatCompact`, `formatRelativeTime`, `formatSalaryRange`. Force `numberingSystem: "arab"` (via `-u-nu-arab` BCP-47 extension on the RelativeTimeFormat path where the TS lib drops the option) for every ar-\* locale so Arabic surfaces render Arabic-Indic numerals consistently. Web jobs list / job detail / notifications / PostCard / messages and mobile notifications all swapped over.
12. ✅ **ui-native `Sheet` primitive** — Modal-based bottom sheet (no gesture-handler dep yet; public API is a subset of `@gorhom/bottom-sheet` so a later swap is a render-shape change only). Used by the mobile jobs filter sheet + cover-letter sheet.
13. ✅ **ui-native `MessageBubble` atom + mobile messages port** — own bubbles now use `brand100 + brand200` border (matching web) instead of the deprecated `brand600` CTA-color anti-pattern; status ticks share the same `computeStatus` rules as web (`pending-` id → sending, failed set → failed, `otherLastReadAt` → read, else sent). Room list ported to `Surface` + `Avatar`.
14. ✅ **Mobile onboarding ported** to `nativeTokens` + `Button`. Form is wrapped in a `KeyboardAvoidingView` + `ScrollView` so the CTA stays reachable when the Arabic keyboard is up.
15. ✅ **Mobile jobs filter sheet** — header pill with active-count badge opens a `Sheet` containing search, city text input, and type / location chip rows. Debounced (250ms) refetch on any filter change.
16. ✅ **Cover-letter on apply** — web `/jobs/[id]` opens an accessible `<ApplyDialog>` and mobile opens a `Sheet`; both send `{ coverLetter }` (or `{}`) to the idempotent endpoint. Matches the `ApplyToJobBody` schema's 8,000-char cap.
17. ✅ **Accessibility sweep** — new Playwright spec runs `@axe-core/playwright` against the public routes (landing + login + register, both locales) on every PR. Authenticated pages deferred to Sprint 7 (need a test-user session fixture).
18. ✅ **Perf budget** — Lighthouse CI job on PRs. Hard fails LCP > 2.5s, TBT > 200ms, CLS > 0.1, and a11y < 0.95. Warns on FCP > 1.8s, SI > 3.4s, perf < 0.85, best-practices < 0.9. Uses the desktop preset; mobile preset pass arrives with Sprint 7 image tuning.

#### Sprint 6 follow-ups (punted to Sprint 7)

- **Arabic copy QA** — jobs + messaging strings were authored by a non-native. Needs a native-speaker pass before launch.
- **Authenticated a11y coverage** — axe currently only hits public routes. Build a test-user session fixture so feed / jobs / jobs/[id] / notifications / search / in/[handle] / messages get scanned too.
- **Mobile image-tuning + mobile-preset Lighthouse run** — the web budget is desktop-only until we audit the mobile bundle.
- **`@gorhom/bottom-sheet` migration** — once a screen needs drag-to-dismiss or snap points, swap `Sheet`'s internals. Public API is already shaped for it.
- **Swipe-to-archive on room rows + tab-hiding thread presentation** still outstanding from Sprint 5.

### Sprint 7 — Mobile screen ports + Skeleton primitive ✅ SHIPPED

**Landed in Sprint 7:**

- `08ef1667bf2f08bc476594830566ce7ecbc016b6` — repaired stale sanity-gate commands for this Windows worktree (`tokens:build`, `@baydar/web` filter, prototype opener).
- `3987f916929c1fa65c345c9057974f0117588e50` — added `Skeleton` + `PostCardSkeleton` to `@baydar/ui-native`, exported both, and wired first-page feed loading to the new post skeleton stack.
- `2a0019c83b4870a06820406ca8cfba9e9a05ab60` — ported mobile Network, Notifications, Search, Composer, and Profile Edit screens to `Surface` / `Avatar` / `Button` / `Icon` / `nativeTokens`; added 250ms search debounce; localized new Arabic-first keys; audited jobs detail raw sizing.

#### Sprint 7 QA gap list

- **Git hook gap:** `.husky/pre-commit` calls `pnpm lint-staged`, but `lint-staged` is not installed in this branch. Sprint 7 forbids adding deps, so commits used `--no-verify` after the required gates passed directly. Sprint 8 should either add the intended hook dependency in its own guardrail PR or adjust the hook.
- **Expo dependency warnings:** `pnpm --filter @baydar/mobile start` is green, but Expo prints pre-existing package compatibility warnings for `expo-image-picker`, `react-native`, `react-native-screens`, and `react-native-svg`. Not changed in Sprint 7 because deps added/updated = none.
- **Existing lint warning:** `apps/mobile/src/i18n/index.ts` still reports one `@typescript-eslint/no-unused-vars` warning for `SUPPORTED`. Mobile lint exits 0.
- **Visual screenshots:** ar/en screenshot pairs were not captured in this shell. Claude should review the five ported screens on simulator/device before starting Sprint 8.

### Sprint 8 — Native UX layer ✅ SHIPPED

**Landed in Sprint 8:**

- `abf3adf` — added `lint-staged` as a workspace devDependency, wired staged hooks to `pnpm lint:tokens` + `pnpm --filter @baydar/mobile lint`, and removed the unused `SUPPORTED` i18n symbol.
- `18fbb7b` — ran `npx expo install --fix` in `apps/mobile`, aligning Expo-managed native package versions and committing the lockfile bump separately.
- `4bfe523` — added approved Sprint 8 deps only: `expo-haptics`, `expo-image`, `react-native-sse`, and API-only `blurhash`.
- `8d3e2ec` — shipped haptics, expo-image Avatar/media migration, API blurhash placeholders, `Media.blurhash` migration, pull-to-refresh, swipe-to-archive, hidden message thread tabs, mobile SSE, memoized row components, and keyboard avoidance on auth/composer/profile edit screens.

#### Sprint 8 QA gap list

- **Manual device evidence not captured in this shell:** Pull-to-refresh, haptic feel, second-device SSE latency, swipe archive gesture, and blurhash placeholder under killed network still need Claude/device review.
- **Archive migration is additive:** `202604270002_chat_room_member_archive` ships with the Sprint 8 implementation because swipe archive needs `ChatRoomMember.archivedAt`; include it when applying DB migrations.
- **Blurhash v1 is API-generated deterministic placeholder:** The API returns a stable low-fi blurhash at presign time without image-byte decoding. It unblocks Expo placeholders now; exact image-derived blurhash can be upgraded later if we approve a decoder dependency.
- **Expo peer warnings remain informational:** `pnpm install` still reports pre-existing `react-dom` peer warnings from Expo/Jest packages. Type-check, lint, API tests, and token lint are green.

### Sprint 9 — Auth resilience + deep links + push notifications ✅ SHIPPED

**Landed in Sprint 9:**

- `659fa02` — added the mobile API refresh interceptor: single in-flight `/auth/refresh`, automatic Authorization injection when callers omit `token`, one retry after refresh, public auth calls marked `skipAuth`, and refresh failure cleanup back to `/(auth)/login`.
- `58ea23c` — added Baydar deep-link routing for `baydar://u/{handle}`, `baydar://post/{id}`, `baydar://messages/{roomId}`, `baydar://jobs/{id}`, HTTPS universal-link mappings, app config intent filters/associated domains, and draft `.well-known` files.
- `58ea23c` — added Expo push registration/tap routing on mobile plus API `POST /notifications/devices`, best-effort Expo Push fanout from notification creation, shared request schema, `expo-notifications` / `expo-device` / `expo-server-sdk` deps, and DeviceToken persistence.
- `58ea23c` — added `202604260001_init` baseline plus `202604280001_device_token`, so `prisma migrate dev` applies cleanly from an empty verification database before Sprint 8 and Sprint 9 additive migrations.
- `3e93617` — fixed live API boot by making Node runtime resolve workspace packages through built `dist`, adding API prebuild/predev/prestart/pretest build hooks for `@baydar/shared` + `@baydar/db`, and marking `/health` public for liveness monitoring.

#### Sprint 9 QA gap list

- **Manual device evidence not captured in this shell:** refresh success with a deliberately stale access token, refresh failure after clearing the refresh token, Notes/browser deep-link taps, self push tap-to-route, and five concurrent stale requests proving one server `/auth/refresh` still need physical-device/user smoke.
- **Universal-link hosting deferred to Sprint 12:** `apps/web/public/.well-known/apple-app-site-association` and `assetlinks.json` are committed as drafts. Replace `TEAMID` and `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT` before hosting.
- **Push token is physical-device dependent:** simulator returns `null` by design through `Device.isDevice`; final push registration still needs a granted-permission Expo Go/device run.
- **Messaging follow-ups remain Sprint 11 work:** jump-to-unread, group rooms, and message edit/delete stay deferred.

### Sprint 10 — Production hardening QA gap list

- **Manual device evidence not captured in this shell:** deliberate crash/Sentry receipt, airplane-mode banner + SSE resume, physical coverage screenshot, and production-environment Sentry init still need Claude/device review.
- **EAS project binding still needs an authenticated Expo account:** `extra.eas.projectId` remains `REPLACE_WITH_EAS_PROJECT_ID` until `eas init` can run in a logged-in shell. EAS Updates URL should be set from that real project id in the same pass.
- **Observability keys are placeholders:** production `eas.json` now documents `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_POSTHOG_KEY`, and the app safely no-ops on `REPLACE_WITH_*` values. Replace them in EAS secrets/env before release.

### Sprint 11 — Launch polish QA gap list

- **Arabic copy was AI-assisted:** `apps/mobile/src/i18n/ar.json` and `apps/web/messages/ar-PS.json` were reviewed for Modern Standard Arabic consistency, but no native human reviewer signed off. Treat final copy review as a Sprint 12 release blocker.
- **Manual cross-device smoke remains owed:** unread jump, group room creation, peer SSE delivery, edit/delete propagation, and the after-15-minute edit denial need physical-device or two-session evidence.
- **Authenticated job-detail a11y skipped without seed data:** the authenticated Playwright fixture scanned feed, jobs, notifications, search, profile, and messages in `ar-PS` and `en`; job detail is skipped when the verification database has no seeded job.
- **Mobile Lighthouse baseline is public/auth route coverage:** `apps/web/lighthouse/baseline-mobile.json` uses the mobile preset on `/ar-PS`, `/en`, `/ar-PS/login`, and `/ar-PS/register`. Authenticated app-route Lighthouse with storage state is deferred to Sprint 12.
- **Message timestamps migration already existed:** `Message.editedAt` and `Message.deletedAt` were present in the `202604260001_init` baseline migration, so Sprint 11 did not add a new Prisma migration folder.

### Sprint 11.5 — Bundle gate + audit fixes ✅ SHIPPED

Pre-Sprint 12 hardening. Closed gaps that no prior sprint surfaced because Codex never compiled an actual Expo bundle in any verification step (only ran type-check + Metro start ack). Audited every prior sprint and fixed actionable findings.

**Critical infra fixes:**

- **Expo monorepo bundle gate:** added repo-root `.npmrc` with `node-linker=hoisted` + `shamefully-hoist=true`. pnpm strict isolation was breaking every Expo transitive dep lookup (`react-native-css-interop/jsx-runtime`, `@babel/runtime/helpers/*`, `whatwg-fetch`, etc.). Without this, `expo export` and any device launch fails at module resolution before the first React render.
- **Missing peer dep:** `@expo/metro-runtime@~4.0.0` is a peer of `expo` itself but was never declared. Added to `apps/mobile/package.json` so Metro can resolve `expo-router/entry-classic.js`.
- **Bundle compile evidence:** `pnpm exec expo export --platform ios --dev` → 2135 modules / 13.5 MB; `--platform android` → 2139 modules. Both green.

**Audit fixes from Sprints 9–11:**

- **Sprint 9 push body locale:** `apps/api/src/modules/notifications/push.service.ts` now reads `User.locale` and emits Arabic OR English notification copy + title (`بيدر` / `Baydar`). Previously every push was hardcoded Arabic, ignoring recipient preference.
- **Sprint 10 NetInfo seed:** `apps/mobile/app/_layout.tsx` calls `NetInfo.fetch()` once on mount before subscribing. Previous optimistic `isConnected: true` would lock the offline banner off until the OS fired its first connectivity change event.
- **Sprint 10 Sentry release:** `apps/mobile/src/lib/observability.ts` passes `release: process.env.EXPO_PUBLIC_APP_VERSION` to `Sentry.init` so production crash reports symbolicate against the right build.
- **Sprint 10 SSE auth header:** `apps/mobile/src/lib/sse.ts` now sends `Authorization: Bearer <token>` instead of `?access_token=` query param. The JWT guard (`apps/api/src/modules/auth/guards/jwt-auth.guard.ts`) already accepts both, so no backend change needed. Stops token leakage to server access logs and HTTP referrers.
- **Sprint 11 a11y fixture validation:** `apps/web/tests/fixtures/auth.ts` now runs `AuthSession.parse()` on the API response before persisting to `storageState.json`. Previously a malformed login response would silently pass and authenticated routes would fail hydration with no actionable error.

**Audit findings rejected after deeper review (NOT bugs):**

- Web hover edit/delete menu — already present at `apps/web/src/app/[locale]/(app)/messages/page.tsx:715-732`.
- `Skeleton` not exported from ui-native — already exported at `packages/ui-native/src/index.ts:15-18`.
- `CreateOrGetDmBody` discriminator — current `z.union([dm, group])` resolves correctly because `z.object()` strips unknown fields by default; group's `isGroup: z.literal(true)` cannot match a missing field, so DMs route correctly.

**Verification logs:**

```
pnpm install                                       # done in 33s, hoisted
pnpm --filter @baydar/db generate                  # green
pnpm --filter @baydar/api type-check               # clean
pnpm --filter @baydar/web type-check               # clean
pnpm --filter @baydar/mobile type-check            # clean
pnpm --filter @baydar/mobile lint                  # clean
pnpm lint:tokens                                   # clean
pnpm --filter @baydar/api test                     # 10 suites / 50 tests
pnpm --filter @baydar/mobile test                  # 5 suites / 7 tests / 1 snapshot
                                                   # ui-native coverage: 64.24% lines
expo export --platform ios --dev                   # 2135 modules ✓
expo export --platform android --dev               # 2139 modules ✓
```

**Sprint 11.5 follow-ups (carry to Sprint 12 or beyond):**

- **Branch coverage gap:** `Sheet.tsx` 0% branch, `Skeleton.tsx`/`PostCardSkeleton.tsx` 0%, `Icon.tsx` 3.7%, `MessageBubble.tsx` 5.71%. Statement coverage 64.24% is above the 60% target but branch coverage is still thin.
- **Real device review still owed for every sprint** — Sprints 8–11 manual smoke evidence was never captured.

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

| From                                              | To                                        |
| ------------------------------------------------- | ----------------------------------------- |
| `handoff/CLAUDE.md`                               | `CLAUDE.md`                               |
| `handoff/DESIGN.md`                               | `DESIGN.md`                               |
| `handoff/BRAND.md`                                | `BRAND.md`                                |
| `handoff/HANDOFF.md`                              | `docs/HANDOFF.md`                         |
| `handoff/packages/ui-tokens/src/index.ts`         | `packages/ui-tokens/src/index.ts`         |
| `handoff/packages/ui-tokens/src/tokens.css`       | `packages/ui-tokens/src/tokens.css`       |
| `handoff/packages/ui-tokens/src/tokens.native.ts` | `packages/ui-tokens/src/tokens.native.ts` |
| `handoff/packages/ui-tokens/tailwind-preset.ts`   | `packages/ui-tokens/tailwind-preset.ts`   |
| `handoff/docs/components/*.md`                    | `docs/components/*.md`                    |
| `handoff/docs/design/RTL.md`                      | `docs/design/RTL.md`                      |
| `handoff/docs/design/MOBILE.md`                   | `docs/design/MOBILE.md`                   |
| `handoff/docs/design/TESTING.md`                  | `docs/design/TESTING.md`                  |
| `handoff/docs/_archive/prototype-2025/*`          | `docs/_archive/prototype-2025/*`          |

After copying, delete the `handoff/` folder from this design project — it lives in the repo now.

## Final sanity check before starting Sprint 1

Run these commands. All must succeed:

```powershell
pnpm install
pnpm tokens:build          # regenerates tokens.css + tokens.native.ts
pnpm --filter @baydar/web dev  # renders in olive palette, RTL, Arabic fonts loaded
Start-Process "docs/_archive/prototype-2025/Baydar Prototype.html"  # archived visual reference
```

If any of those fail, fix them before writing a single new component.
