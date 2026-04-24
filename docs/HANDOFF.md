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
10. ✅ **Mobile profile ported** to `Surface` / `Avatar` / `Button` from `@palnet/ui-native`. Same connection matrix, same optimistic updates; styling now flows through `nativeTokens` instead of nativewind class strings.
11. ✅ **Shared i18n formatters** in `@palnet/shared` — `formatNumber`, `formatCurrency`, `formatCompact`, `formatRelativeTime`, `formatSalaryRange`. Force `numberingSystem: "arab"` (via `-u-nu-arab` BCP-47 extension on the RelativeTimeFormat path where the TS lib drops the option) for every ar-\* locale so Arabic surfaces render Arabic-Indic numerals consistently. Web jobs list / job detail / notifications / PostCard / messages and mobile notifications all swapped over.
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

### Sprint 7 — Media polish + Account self-serve ✅ SHIPPED

Two tracks: (A) upload flow that doesn't feel janky on slow networks, (B) the bare minimum of account self-service every real user expects on day one.

#### A. Media — blurhash placeholders + cover uploads

1. ✅ **Blurhash atom** — new `Image` component in `packages/ui-web` (canvas-decoded 32×32 LQIP that cross-fades to the real image on `onload`) and `packages/ui-native` (average-color `View` + `Animated.Image` opacity fade). Same prop names both sides.
2. ✅ **Server-side encode** — `POST /media/hash` downsamples the R2 object to 32×32 raw RGBA via `sharp`, runs `blurhash.encode(4, 3)`, and returns the string. SSRF guard asserts the URL's origin matches `R2_PUBLIC_URL` before fetching.
3. ✅ **Upload wrapper** — `uploadImage` on web + `uploadImageAsset` on mobile wrap `uploadFile` + the hash call, returning `{ publicUrl, blurhash }`. Hash failure is soft — the upload still succeeds, we just don't show a placeholder.
4. ✅ **Persist blurhash** — schema adds `Profile.avatarBlur`, `Profile.coverBlur`, `Media.blurhash`. DTOs + mappers updated on API; shared schemas propagate the new fields.
5. ✅ **Cover uploads** — edit-profile page gained a "Change cover" file input; profile view renders a cover band above the hero Surface.
6. ✅ **Composer + PostCard** — image picks now flow through `uploadImage`; the feed card uses the `Image` atom so the blur fades on first paint.

B6 (company page cover/media admin) was scoped but deferred — there's no standalone `companies` admin module yet; comes in the sprint that builds the company-manager UI.

#### B. Accounts — settings + email verify + password reset

7. ✅ **`/settings/*` shell** — layout with sidebar nav for Account / Sessions / Notifications; existing "settings" gear now routes here (was sending users to `/me/edit`).
8. ✅ **`/settings/account`** — change email (requires current password, clears `emailVerified`), change password (reject new==old, server revokes all refresh tokens, client pairs with local `clearSession` + redirect), delete account (typed "DELETE" confirmation, soft-deletes + frees the email via `+deleted@baydar.invalid`).
9. ✅ **`/settings/sessions`** — lists live refresh tokens tagged with the current device, individual revoke + "sign out everywhere else" (excludes current device via `keepDeviceId`). Short UA parser so rows read "Chrome · macOS" instead of the raw UA string.
10. ✅ **`/settings/notifications`** — matrix of event × channel checkboxes (in-app / email / push across connections, messages, reactions, comments, jobs). Stored as a `User.notificationPrefs` JSON column; missing keys fall back to sensible defaults on read.
11. ✅ **Email verification** — `EmailVerificationToken` table (SHA-256 hashed at rest, 24h TTL). `POST /auth/email/verify/request` (authed, rate-limited) sends a link; `POST /auth/email/verify` consumes it and stamps `user.emailVerified`. Register now fires verification email on account creation (best-effort, non-blocking). Banner on the `(app)` shell nudges unverified users with a one-click "resend."
12. ✅ **Password reset** — `PasswordResetToken` table (same hashing + 1h TTL). `POST /auth/password/reset/request` never leaks whether the email exists; `POST /auth/password/reset` rotates the hash and revokes every refresh token for the user. `/forgot-password` + `/reset-password` pages; "Forgot password?" link on the login form.
13. ✅ **Logout-everywhere** — `POST /account/sessions/revoke-all` with optional `keepDeviceId`. Wired from `/settings/sessions` (keeps current device by default).
14. ✅ **Mail transport** — tiny Resend wrapper with a dev fallback that logs would-be emails to stdout when `RESEND_API_KEY` is missing, so auth flows stay testable without provider wiring.

Schema adds (no migration files — project runs `prisma db push` in dev; CI `db:deploy` is a no-op until the first migration lands):

- `User.notificationPrefs Json?`
- `EmailVerificationToken` (id, userId, email, tokenHash, expiresAt, consumedAt, createdAt)
- `PasswordResetToken` (id, userId, tokenHash, expiresAt, consumedAt, createdAt)
- `Profile.avatarBlur`, `Profile.coverBlur` (both `String?`), `Media.blurhash String?`

`AuthSession.user` gained `emailVerified: boolean` — any older local session stays usable (the layout default-trues it until `/auth/me` overrides with the authoritative flag).

#### Sprint 7 follow-ups (punted to Sprint 8)

- **Company admin cover + media (B6)** — no `companies` admin module exists yet; pair with whatever sprint lands the company-manager screen.
- **E14 Mobile-preset Lighthouse run** — web budget still desktop-only.
- **E15 Authenticated a11y sweep** — axe still skips authed routes; needs a test-user session fixture.
- **Mobile blurhash full-render** — native atom is average-color only. Swap to `react-native-blurhash` (or a WASM decoder) once the image density warrants it.
- **Verify-email deep link on mobile** — link currently opens `EMAIL_VERIFY_URL_BASE` (web). Mobile deep-link handling comes when the mobile auth flow ships.
- **Notification prefs enforcement** — the prefs screen writes the column, but the emit sites (reactions, comments, connections, messages, jobs) still fan out to all channels. Gate each send-site on the prefs read.

### Sprint 8 — Prefs enforcement + Company media + Auth polish ✅ SHIPPED

**Goal:** cash the four biggest Sprint 7 IOUs: wire the notification prefs the settings screen has been writing for a sprint; ship company cover/logo upload so admin pages stop looking half-finished; tighten the auth edges (mobile deep-link, auto re-verify after email change, per-email throttle); and add the QA surfaces the release checklist has been flagging (mobile Lighthouse, authed a11y).

#### A. Notification prefs enforcement

1. ✅ **Email fanout gating** — `NotificationsService.notify` now reads `User.notificationPrefs` before the mail side-channel fires. Each `NotificationType` maps to a `NotificationEvent` (`connections | messages | reactions | comments | jobs`); missing prefs fall back to the opt-in defaults declared in `packages/shared`. Unit tests cover the "email off → no send" and "email on → send" branches without hitting Resend.
2. ✅ **In-app master switch** — `inApp=false` on an event now short-circuits the DB insert, so a user who silenced comments won't see a row even if they revisit the page. SSE fanout keys off the same check so live listeners don't get a ghost notification.
3. ✅ **Push stub** — push is still a no-op transport, but the prefs read already short-circuits it, so flipping the toggle is wired through for when APNs/FCM lands. Documented as a stub in the notifications module comment.

#### B. Company admin — logo + cover media (B6 from Sprint 7)

4. ✅ **Schema** — `Company.logoUrl / logoBlur / coverUrl / coverBlur` all present; `MediaPurpose` enum gains `COMPANY_LOGO` (2 MB cap) and `COMPANY_COVER` (5 MB cap). Blurhash generated server-side via the existing `sharp` + `blurhash-encoder` pipeline so `Image` can fade in on web.
5. ✅ **`/companies/[slug]/admin` media card** — two Uploader cards (logo + cover) above the edit form. Upload flow reuses `POST /media` → attach URL + blurhash onto the company via `PATCH /companies/:id`. Empty state shows a tokenised placeholder tile.
6. ✅ **RBAC refactor** — `CompanyMemberRole` grows a tier: `OWNER`/`ADMIN` keep member-management rights (`canManage`), `EDITOR` now gets `canEdit` for content ops (profile fields, media, jobs, applications). `assertCanManage(viewer, companyId, "OWNER_OR_ADMIN" | "ANY_EDITOR")` handles both. Members section on admin page hides when only `canEdit` is true.
7. ✅ **Public cover render** — `/companies/[slug]` top surface renders the cover `<Image>` with `blurhash` fade-in when set, falls back to the flat olive hero when absent. Matches the profile cover pattern so visual language stays consistent.

#### C. Auth polish

8. ✅ **Mobile verify-email deep link** — `apps/mobile/app/(auth)/verify-email.tsx` reads `?token` via `useLocalSearchParams`, POSTs to `/auth/email/verify`, shows verifying / ok / error / missing states. Expo custom scheme `baydar://verify-email?token=…` works today; universal-link deployment (AASA + digital-asset-links) is a launch-time config punt, not a code change.
9. ✅ **Change-email auto re-verify** — `AccountService.changeEmail` now fires `void this.auth.sendEmailVerification(userId)` after the row update. User lands on the unverified banner but with a fresh link already in their inbox.
10. ✅ **Per-email rate limit** — `sendEmailVerification` and `requestPasswordReset` each silently no-op if a token was issued for the same `(userId, email)` inside 60 s. Silent skip preserves the enumeration defence — UI always reports "sent."

#### D. QA sweep

11. ✅ **Mobile-preset Lighthouse** — new `apps/web/lighthouserc.mobile.json` with moto-g-power emulation + Lighthouse's default 4G throttle (1.6 Mbps down, 150 ms RTT, 4× CPU). Thresholds loosened relative to desktop (LCP 4 s / TBT 300 ms / perf 0.75) but a11y stays at 0.95. New `lighthouse-web-mobile` CI job runs in parallel with the desktop job on PRs.
12. ✅ **Authed a11y fixture** — `apps/web/e2e/a11y-authed.spec.ts` provisions a real user via `createUserViaApi`, seeds the session into `localStorage` via the existing `setSession` helper, then sweeps axe across feed, own profile, jobs, notifications, messages, and settings in both locales where it matters. Same WCAG 2.1 AA + best-practice tag set as the public sweep.

Schema adds:

- `Company.logoBlur String?`, `Company.coverBlur String?`
- `MediaPurpose` enum: `COMPANY_LOGO`, `COMPANY_COVER`

Shared contract changes:

- `CompanyViewerState` = `{ canManage, canEdit, role }` (was `{ canManage }`)
- `CompanySummary` + `Company` gain `logoBlur` / `coverBlur`
- `CreateCompanyBody` accepts optional `logoBlur` / `coverBlur`

#### Sprint 8 follow-ups (punted)

- **Universal links for verify-email on mobile** — Apple AASA + Android Digital Asset Links deploy-time config. Custom scheme works for dev; universal links wait until the app has a signed TestFlight build behind a real domain.
- **Push transport** — prefs are gated but the transport itself is still a no-op. APNs + FCM wiring is its own track.
- **Mobile blurhash full-render** — still average-color; upgrade when image density warrants it.
- **Company public page skeleton** — cover loads eagerly; ship a `Surface`-matching shimmer when the cover image is slow.

### Sprint 9 — Mobile parity + public-page polish ✅ SHIPPED

**Goal:** close the gap that opened after Sprints 6/7/8 shipped web-first and the mobile app lagged. Ship the Sprint 8 IOUs (push transport, native blurhash, company page skeleton), draw a real logo mark, and stand up the first mobile E2E smoke so the parity doesn't rot again.

**Order (cosmetic → refactor → feature → QA):** D → A → B → C → E. Cosmetic and schema-only changes (skeletons, logo) land first so subsequent ports/refactors inherit the final look. Mobile screen ports (A) before the blurhash rewrite (B) so the new atom has callers. Push transport (C) after the mobile screens so the registration call has a real app to boot from. E2E (E) last so it asserts the state the sprint actually ends in.

#### D. Cosmetic punts

1. ✅ **`ProfilePageSkeleton`** in `packages/ui-web` — cover + hero (avatar 80×80 + 4 text shapes + action button) + About Surface + Experience Surface with 2 items. Dropped into `/in/[handle]` in place of the `…` glyph loader.
2. ✅ **`CompanyPageSkeleton`** in `packages/ui-web` — cover band (176–224 px) + 64×64 logo hero + name/tagline/meta block + About surface + 3-item Jobs list. Replaces the ad-hoc pulse shapes on `/companies/[slug]`, matching the Sprint 8 follow-up.
3. ✅ **Baydar logo mark** — olive-circle + cream wheat-head SVG (stem + 8 rotated grain ellipses) in `packages/ui-tokens/assets/` with mono + RTL/LTR wordmark variants. `apps/web/src/app/icon.svg` + `apple-icon.svg` wired via the Next.js App Router convention. `scripts/build-brand-icons.mjs` rasterizes the SVG through `sharp` into the Expo `icon.png` / `adaptive-icon.png` / `favicon.png` / `splash.png` set (adaptive background flipped from `#ffffff` to `brand-50 #f4f6ef` so the foreground doesn't island). Adds `pnpm tokens:icons` script.

#### A. Mobile screen ports

4. ✅ **Profile cover render** — `/in/[handle]` now renders `profile.coverUrl` through the `ui-native` `Image` atom with `coverBlur` as the placeholder, matching the web hero. Was the last "web-only" surface in the Sprint 7 media sweep.
5. ✅ **Messages archive (schema + API)** — `ChatRoomMember.archivedAt` + `@@index([userId, archivedAt])`. `MessagingService.listMyRooms` now takes `{ archived? }` and filters on `archivedAt: archived ? {not:null} : null`. New `archiveRoom` / `unarchiveRoom` methods are idempotent (matched `updateMany` where-clause). `sendMessage` auto-clears `archivedAt` for **non-sender** members so a new message resurfaces the thread for the recipient without undoing the archiver's own hide. Controller gains `?archived=1` query on list-rooms and `POST /messaging/rooms/:id/{archive,unarchive}`.
6. ✅ **Swipe-to-archive on mobile** — wired `react-native-gesture-handler`'s `Swipeable` into the room row. RTL-aware: `I18nManager.isRTL` flips `renderLeftActions` ↔ `renderRightActions` so the gesture always reveals from the trailing edge. `GestureHandlerRootView` now wraps the root `_layout.tsx`. Optimistic filter-out on success; i18n adds `messaging.archive` / `unarchive`. Closes the Sprint 5 IOU.

#### B. Native blurhash full-render

7. ✅ **`ui-native` `Image` atom rewrite** — dropped the single-`View` average-color LQIP for a `react-native-svg` 32×32 `<Rect>` grid fed by `blurhash.decode(hash, 32, 32)`. Pure JS, no new native modules (svg ships with Expo; blurhash is already a dep). Memoised per hash so scrolling lists don't re-decode. Prop API unchanged — every existing call site picks up the full-detail placeholder with zero changes.

#### C. Push transport (Expo)

8. ✅ **`PushToken` model** — `@@unique([userId, deviceId])` + `@@index([userId])`, fields `(id, userId, deviceId, token, platform, createdAt, lastSeenAt)`. `User.pushTokens` relation added.
9. ✅ **Register / revoke API** — new `RegisterPushTokenBody` in `@palnet/shared` (`{ deviceId, token, platform: "ios"|"android"|"web" }`). `AccountService.registerPushToken` upserts on the composite key (overwrites the stored token + refreshes `lastSeenAt` so OS-initiated rotations don't leak duplicate rows). `revokePushToken` is a `deleteMany` — idempotent on logout retries. Controller exposes `POST /account/push-tokens` + `DELETE /account/push-tokens/:deviceId`.
10. ✅ **Expo push fanout** — `NotificationsService.sendPush` no longer a stub: reads `PushToken` rows for the recipient, posts a batch to `https://exp.host/--/api/v2/push/send` with `{ title, body, sound, data: { type, userId } }` per device, prunes any row Expo reports back with `details.error === "DeviceNotRegistered"`. Only `ExponentPushToken[...]`/`ExpoPushToken[...]` tokens are sent — raw FCM/APNs tokens are dropped because we only speak Expo from the client. Errors stay fire-and-forget; push failure never bubbles into the user's action.
11. ✅ **Mobile registration** — new `apps/mobile/src/lib/push.ts` with `registerForPush` (requests permission via `expo-notifications`, creates the Android `default` channel, fetches the Expo push token, registers with the API using the SecureStore `deviceId`). Fire-and-forget from `loginAction` + `registerAction` so the app has a push token the moment the first session exists. `Device.isDevice` guard bails on simulators. `unregisterForPush` exists for a future mobile logout UI.
12. ✅ **Logout cascade** — `AuthService.logout` now runs the refresh-token revoke + push-token delete in a single `$transaction`, so signing a device out on any surface (web settings, revoke-all, future mobile logout) also kills its push feed. Expo's `DeviceNotRegistered` prune above is belt-and-braces for the tokens we never see logout for.
13. ➕ **Deps added:** `expo-notifications ~0.29`, `expo-device ~7.0` on `@palnet/mobile`. Both are Expo-maintained and ship with the SDK 52 plugin story, no custom native build config needed.

#### E. Mobile E2E smoke

14. ✅ **Maestro over Detox** — picked for zero native build config (works against the managed Expo app we already ship — Detox would break EAS), YAML flows (readable, no JS), and a Maestro Cloud path for future CI without us running emulators.
15. ✅ **`.maestro/` flow set** — `config.yaml` pins `appId: ps.palnet.app`; `auth-happy-path.yaml` launches clean, fills `login-email` / `login-password`, taps `login-submit`, asserts `screen-feed` + `feed-title` appear. Login screen + feed header gained `testID` attributes so matchers survive en↔ar copy changes.
16. ✅ **`.maestro/README.md`** — install steps for local use, prereq order (DB seed → API → Expo dev client → `maestro test`), and the intentional "not in CI yet" rationale (Linux GH runners + Android emulators = slow/flaky without a paid runner; revisit via Maestro Cloud when the flow count passes three).

Schema adds:

- `ChatRoomMember.archivedAt DateTime?` + `@@index([userId, archivedAt])`
- `PushToken` (id, userId, deviceId, token, platform, createdAt, lastSeenAt) with `@@unique([userId, deviceId])` + `@@index([userId])`
- `User.pushTokens PushToken[]`

Shared contract adds:

- `RegisterPushTokenBody = { deviceId, token, platform: "ios"|"android"|"web" }`

Sprint baseline: API tests 51/51 green, `pnpm --filter @palnet/api type-check` clean, `pnpm --filter @palnet/mobile type-check` clean.

#### Sprint 9 follow-ups (punted)

- **`expo-notifications` projectId config** — `getExpoPushTokenAsync` silently returns no token until `app.json` has `extra.eas.projectId` (or we pass it explicitly). Lands with the first EAS build.
- **Mobile logout UI** — no logout surface exists on the mobile app yet; `unregisterForPush` is written and unused. Pair with whatever sprint ships the mobile settings screen.
- **Maestro flow coverage** — only the auth happy path is scripted. Follow-ups: compose post, open profile, open room + send message, toggle archive. Matching testIDs need to be added alongside each flow.
- **Maestro Cloud CI hook** — intentionally not wired yet; revisit once we have 3+ flows.
- **Expo push receipt reconciliation** — we prune on `DeviceNotRegistered` in the send response, but Expo's two-phase model also hands back receipt tickets that can fail async. Not worth a cron for the current install base; revisit if push reliability complaints come in.
- **Universal links for verify-email on mobile** — still outstanding from Sprint 8; needs a TestFlight build behind a real domain.

### Sprint 10 — Day-one safety + mobile finishing ✅ SHIPPED

**Goal:** close launch blockers: mobile auth/account finish, reporting/blocking, symmetric safety enforcement, endpoint throttles, authenticated a11y coverage, and broader native smoke flows.

1. ✅ **Mobile auth deep links** — Expo routes handle verify/reset tokens with user-visible loading/success/error states. Auth links can target web and app independently through `EMAIL_VERIFY_MOBILE_URL_BASE` / `PASSWORD_RESET_MOBILE_URL_BASE`, with `MOBILE_APP_SCHEME` retained as a legacy fallback.
2. ✅ **Mobile settings + logout** — settings stack now includes account, sessions, notifications, blocked accounts, and a header logout button that confirms before calling the shared logout action.
3. ✅ **Moderation schema/API** — `ReportReason` is the launch enum (`SPAM`, `HARASSMENT`, `HATE_SPEECH`, `VIOLENCE`, `ADULT_CONTENT`, `IMPERSONATION`, `OTHER`). `CreateReportBody`, `BlockUserBody`, and block-list DTOs live in `@palnet/shared`. New API routes: `POST /reports`, `POST /blocks`, `DELETE /blocks/:userId`, `GET /blocks`.
4. ✅ **Symmetric block enforcement** — `ModerationService.blockedIds(viewerId)` centralizes the two-way relationship and is enforced in feed, people search, DM creation/listing, and room membership/message access. Block also deletes existing connections both ways.
5. ✅ **Web report/block UI** — feed PostCard now has host-owned menu actions for "Report post" and "Block author"; successful block hides that author's posts. Settings gained `/settings/blocks` with unblock.
6. ✅ **Mobile report/block UI** — feed PostRow has a more button, bottom-sheet `PostActions`, sheet-based `ReportDialog`, block confirmation, and `/settings/blocks` list/unblock screen.
7. ✅ **Rate limits** — global in-memory throttler remains `100/min`. Tight overrides now cover register/login/refresh/password reset/email verify, reports, post creation, comments, reactions, reposts, DM creation, message sends, typing, media presign, connection requests, and block creation.
8. ✅ **Authenticated a11y sweep** — `apps/web/e2e/a11y-authed.spec.ts` provisions a test user through the API, seeds `localStorage`, and runs axe across feed (en + ar-PS), own profile, jobs, notifications, messages, search, settings index, and every settings child (account, sessions, notifications, blocks incl. ar-PS).
9. ✅ **Maestro flow expansion** — `.maestro/` now covers auth, compose post, profile open from search, room send, settings notifications, and settings sessions. Mobile gained stable testIDs for those flows.

Schema/migrations:

- `ReportReason` enum rebuild migration: `202604240001_moderation_report_reasons`. It deletes pre-launch report rows before replacing the old enum values.
- `Report`, `Block`, auth token, account/session, push-token, company/media, and messaging archive schema from prior sprints remain part of the launch baseline.

Verification notes:

- `corepack pnpm --filter @palnet/api type-check` clean.
- `corepack pnpm --filter @palnet/api test -- --runInBand` clean: 53/53 tests.
- `corepack pnpm --filter @palnet/web type-check` clean.
- `corepack pnpm --filter @palnet/mobile type-check` clean.
- Focused Playwright run for `a11y-authed.spec.ts` could not complete locally because the running API returned `500` on `POST /auth/register`; Prisma status also could not connect to local `localhost:5432`. This is an environment/DB availability blocker, not a TypeScript failure.
- Maestro CLI is not installed in this Windows environment, so YAML flows were added but not executed locally.

#### Sprint 10 follow-ups (punted to Sprint 11)

- **Admin moderation triage console** — reports are stored and acknowledged, but no reviewer queue/actions UI yet.
- **More report entry points** — only feed post menus are wired. Add report/block actions to profile, comments, and message surfaces.
- **Web `ar-PS` Sprint 10 copy** — `en` and `ar` moderation/block strings exist; `ar-PS` still needs the blocks nav/copy and moderation namespace pass.
- **Persistent rate limiting** — launch uses the approved in-memory throttler. Move to Redis-backed throttling before horizontal API scaling.
- **Run authed a11y + Maestro with seeded DB** — rerun once local Postgres/CI DB is up and migrations are applied.

---

### Sprint 11 — Moderation ops + launch QA hardening ✅ IMPLEMENTED

**Goal:** turn Sprint 10 report/block primitives into an operator-ready moderation workflow, then close the launch QA/copy gaps.

1. ✅ **RBAC foundation** — added shared API `@Roles(...)` decorator plus global `RolesGuard`. Routes without roles remain unchanged; role-protected routes throw `AUTH_FORBIDDEN` on mismatch. Moderation admin allows only `MODERATOR` and `ADMIN`.
2. ✅ **Report resolver audit** — `Report` now has nullable `resolvedById`, `resolvedBy` relation, and `@@index([resolvedById])`. Migration: `202604240002_report_resolver`.
3. ✅ **Moderation triage API** — new admin endpoints:
   - `GET /admin/reports?status=open|resolved|all&targetKind=&reason=&after=&limit=`
   - `GET /admin/reports/:id`
   - `POST /admin/reports/:id/resolve`
     Responses include reporter summary, reason/details, target kind/id, target preview, created/resolved timestamps, and resolver summary. Missing/deleted targets return an `"unavailable"` preview without hiding the report. Resolve is idempotent.
4. ✅ **Shared admin schemas** — `AdminReportStatus`, `AdminReportListQuery`, `AdminReportTargetPreview`, `AdminReportItem`, `AdminReportPage`, and `ResolveReportBody` live in `@palnet/shared`.
5. ✅ **Web admin console** — `/admin/moderation/reports` under the authenticated app shell, using existing Baydar `Surface` patterns. Includes Open/Resolved/All tabs, reason/target filters, cursor pagination, detail panel, optional resolve note, loading/error/empty states, and forbidden state on API 403.
6. ✅ **Moderator app-shell entry** — profile menu shows **Moderation** only when `/auth/me` returns role `MODERATOR` or `ADMIN`.
7. ✅ **More report/block entrypoints** — web profile page, comments, and DM thread now expose report/block actions. Mobile profile screen, comments list, and message thread mirror this with sheets/buttons and the existing report/block APIs.
8. ✅ **Copy closure** — web `en`, `ar`, and `ar-PS` now include Sprint 10/11 blocks, moderation, and admin triage strings. Mobile `en`/`ar` now include comment/message report labels.
9. ⏭️ **Redis throttling** — not implemented in Sprint 11 because A-E did not finish with a clean browser QA pass in this local environment. Keep in-memory throttling until Redis config can be tested against deployment env.

Verification notes:

- `corepack pnpm --filter @palnet/shared type-check` clean.
- `corepack pnpm --filter @palnet/db type-check` clean.
- `corepack pnpm --filter @palnet/api type-check` clean.
- `corepack pnpm --filter @palnet/api test -- --runInBand` clean: 60/60 tests.
- `corepack pnpm --filter @palnet/ui-web type-check` clean.
- `corepack pnpm --filter @palnet/web type-check` clean.
- `corepack pnpm --filter @palnet/mobile type-check` clean.
- `corepack pnpm --filter @palnet/db db:generate` initially failed on Windows with a locked Prisma engine DLL. `PRISMA_GENERATE_NO_ENGINE=1` generated the updated client types successfully; restart Node dev processes before a normal engineful generate.
- `corepack pnpm --filter @palnet/web exec playwright test e2e/a11y-authed.spec.ts --project=chromium-en` did not run: Playwright waited for the configured API webServer until timeout. API startup failed env validation because `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` were not set in the command environment.
- `maestro --version` failed: Maestro CLI is not installed in this Windows environment.

Authed a11y setup needed before rerun:

1. Start or provide Postgres reachable by `DATABASE_URL`.
2. In the same shell that runs Playwright, export at minimum:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_ACCESS_SECRET` (32+ chars)
   - `JWT_REFRESH_SECRET` (32+ chars)
   - `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`
3. Run `corepack pnpm --filter @palnet/db db:deploy` and `corepack pnpm --filter @palnet/db db:seed`.
4. Rerun `corepack pnpm --filter @palnet/web exec playwright test e2e/a11y-authed.spec.ts --project=chromium-en`.

#### Sprint 11 follow-ups

- **Run Playwright authed a11y in a seeded env** — code path is present; local env did not provide DB/JWT variables.
- **Run Maestro flows** — install Maestro CLI and run against a booted Expo app/device.
- **Persistent rate limiting** — add Redis-backed Nest throttler storage behind optional `REDIS_URL` before horizontal API scaling.
- **Admin depth** — triage is human-only; no suspensions, content deletion, appeals, or audit search yet.

---

### Sprint 12 — Launch QA gates + ops audit closure ✅ IMPLEMENTED

**Goal:** make launch readiness provable in CI/local, add persistent rate-limit storage, and keep moderation ops audit-only.

1. ✅ **Seeded QA harness** — API startup now loads root `.env.local` before Zod validation while preserving real process env precedence. Root `qa:web-authed` now supports `QA_ENV_FILE` with precedence: real process env → selected QA env file → `.env.qa.local` → `.env.test.local` → `.env.local`. It validates required env keys before DB work, refuses non-QA database names by default, runs psql smoke, migrate status/deploy, generate, seed, workspace UI package builds, and focused authed a11y.
2. ✅ **QA env example** — added `.env.test.example` with minimum local QA variables: `DATABASE_URL`, `DIRECT_URL`, JWT secrets, and `NEXT_PUBLIC_API_URL`.
3. ✅ **Authed a11y CI gate** — web script `e2e:a11y-authed` runs `e2e/a11y-authed.spec.ts --project=chromium-en`; CI `e2e-web` now runs it explicitly after migrate + seed.
4. ✅ **Redis-backed throttling** — added optional `REDIS_URL`. No `REDIS_URL` keeps the current in-memory Nest throttler; present `REDIS_URL` installs Redis storage via `ioredis`. Config tests cover both branches.
5. ✅ **Moderation audit filters** — `AdminReportListQuery` now supports reporter, resolver, created date range, and resolved date range filters. API applies those filters to admin report lists.
6. ✅ **CSV audit export** — added `GET /admin/reports/export.csv?...same filters...`, moderator/admin only, read-only, exporting current filtered audit rows.
7. ✅ **Web audit controls** — `/admin/moderation/reports` now exposes reporter/resolver/date-range filters plus CSV export using the existing Baydar `Surface` layout.
8. ✅ **Docs/runbooks** — updated API contract, testing strategy, deployment runbook, `.env.example`, and this handoff. Moderation remains audit-only: no suspensions, deletions, appeals, or automated actions.

Closure verification notes:

- Local ignored `.env.qa.local` points at disposable `palnet_qa`; `psql` smoke succeeds.
- Clean QA DB drift fixed with migrations `202604240003_launch_schema_drift_closure` and `202604240004_moderation_audit_schema_closure`.
- `corepack pnpm qa:web-authed` clean: migrate status/deploy, generate, seed, UI package builds, and 13/13 Chromium authed axe checks pass.
- `corepack pnpm --filter @palnet/api test -- --runInBand` clean: 15 suites, 64/64 tests.
- `corepack pnpm --filter @palnet/shared build` clean.
- `corepack pnpm --filter @palnet/shared type-check` clean.
- `corepack pnpm --filter @palnet/db type-check` clean.
- `corepack pnpm --filter @palnet/api type-check` clean.
- `corepack pnpm --filter @palnet/web type-check` clean.
- `corepack pnpm --filter @palnet/mobile type-check` clean.
- `corepack pnpm --filter @palnet/ui-web type-check` clean.
- `maestro --version` failed: Maestro CLI is not installed in this Windows environment. Optional F not executed.

#### Sprint 12 follow-ups

- Install Maestro CLI and run `.maestro` flows against a booted Expo app/device.
- Re-run full CI after pushing because `e2e-web` now has a hard authed a11y gate.

---

### Sprint 13 — Release candidate + production launch ops 🚧 IN PROGRESS

**Goal:** turn Sprint 10-12 code into a launch-ready release candidate without adding product behavior.

1. ✅ **GitHub repo/PR unblock** — private repo created at `https://github.com/osama-2000236/palnet`; branch `codex/sprint-12-launch-qa-closure` pushed; draft PR opened: `https://github.com/osama-2000236/palnet/pull/1`.
2. ✅ **CI dependency order fix** — CI web builds now use `pnpm --filter @palnet/web... build` so `@palnet/shared`, `@palnet/ui-tokens`, and `@palnet/ui-web` are built before Next.js resolves their `dist` entrypoints.
3. ✅ **Lint dependency order fix** — Turbo lint now depends on upstream package builds, matching the package `main: dist` contract used by ESLint import resolution.
4. ✅ **Format gate fix** — Prettier now ignores unknown file types and preserves local line endings, so Windows local checks and Linux CI checks use the same formatter contract.
5. ✅ **Local release checks** — clean on lint, format, API tests, API/web/mobile/shared/db/ui-web type-check, web build, and seeded authed a11y QA harness.
6. ⏭️ **QA deploy rehearsal** — not executed from this workspace because Render/Vercel/Neon/Redis credentials and preview targets are not available here. Use disposable QA infrastructure only; do not point these steps at dev or prod data.
7. ⏭️ **Mobile/Maestro** — Maestro CLI is still not installed in this Windows environment. Manual mobile smoke remains required before store submission.

Sprint 13 verification:

- `corepack pnpm lint` clean.
- `corepack pnpm format:check` clean.
- `corepack pnpm --filter @palnet/web... build` clean.
- `corepack pnpm qa:web-authed` clean: 13/13 Chromium authed axe checks.
- `corepack pnpm --filter @palnet/api test -- --runInBand` clean: 15 suites, 64/64 tests.
- `corepack pnpm --filter @palnet/api type-check` clean.
- `corepack pnpm --filter @palnet/web type-check` clean.
- `corepack pnpm --filter @palnet/mobile type-check` clean.
- `corepack pnpm --filter @palnet/shared type-check` clean.
- `corepack pnpm --filter @palnet/db type-check` clean.
- `corepack pnpm --filter @palnet/ui-web type-check` clean.

#### Sprint 13 remaining launch ops

- Wait for GitHub Actions on PR #1 and fix CI-only issues only.
- Configure Render API preview, Vercel web preview, Neon QA DB branch, and optional Redis/Key Value outside this repo.
- Run preview smoke: API `/api/v1/health`, web login/feed/profile/jobs/messages/settings blocks/sessions/notifications, and admin moderation reports as moderator/admin.
- Keep PR draft until CI is green and the external preview smoke checklist is complete.

---

### Sprint 14 — Admin depth (suspensions / takedowns / appeals / audit log) ✅ IMPLEMENTED

**Goal:** close the Sprint 11 follow-up "Admin depth" gap — moderation becomes actionable, not just audit-only.

1. ✅ **Schema** — `User.suspendedAt|suspendedReason|suspendedById`, `Post.takedownAt|takedownReason|takedownById`, `Report.appealedAt|appealNote|appealStatus|appealDecisionNote|appealReviewedAt|appealReviewedBy`, and append-only `AuditLog(action, actorId, targetUserId, targetPostId, targetReportId, note, createdAt)` with indexes for filter columns. `AppealStatus` + `AuditAction` enums live in Prisma and mirror into `@palnet/shared`.
2. ✅ **Shared contracts** — `packages/shared/src/schemas/admin-depth.ts` adds `SuspendUserBody`, `UnsuspendUserBody`, `TakedownPostBody`, `RestorePostBody`, `AppealReportBody`, `ReviewAppealBody`, `AppealAck`, `AuditLogItem`, `AuditLogListQuery` (filters: `action`, `actor`, `targetUserId`, `targetPostId`, `targetReportId`, `createdFrom/To`), `AuditLogExportQuery`, and `AuditLogPage`. `AdminReportItem` grows the appeal fields; `AuthSession.user` grows `suspendedAt` + `suspendedReason` so clients can render the banner without a second fetch.
3. ✅ **API — admin actions** (moderator + admin only, each wrapped in a Prisma `$transaction` with an AuditLog row):
   - `POST /admin/users/:id/suspend` — sets `suspendedAt/Reason/ById`, revokes all refresh tokens for that user, writes `USER_SUSPEND`.
   - `POST /admin/users/:id/unsuspend` — clears suspension, writes `USER_UNSUSPEND`.
   - `POST /admin/posts/:id/takedown` — sets `takedownAt/Reason/ById`, writes `POST_TAKEDOWN`. Feed + single-post reads filter `takedownAt: null`, so taken-down posts read as 404 to everyone except future admin surfaces.
   - `POST /admin/posts/:id/restore` — clears takedown, writes `POST_RESTORE`.
   - `POST /admin/reports/:id/appeal/review` — body `{ decision: "UPHELD" | "DENIED", decisionNote? }`. On `UPHELD`, reverses the originating action (clears target user suspension and/or target post takedown) in the same transaction and writes `REPORT_APPEAL_REVIEW`.
4. ✅ **API — user appeal** — `POST /reports/:id/appeal` (owner-of-target only, rate-limited 5/min, `@AllowSuspended()`). Validates that the report is resolved and has no prior appeal. Ownership resolves via separate `post/comment/message` lookups because `Report` stores only target IDs, not relations. Sets `appealedAt`, `appealNote`, `appealStatus = PENDING`.
5. ✅ **API — audit search + CSV** — `GET /admin/audit` (cursor-paginated, filters as above, includes hydrated actor summary) and `GET /admin/audit/export.csv` (up to 500 rows, `text/csv; charset=utf-8`, `Content-Disposition: attachment`). Both moderator + admin only.
6. ✅ **Guardrail — SuspensionGuard** — global guard ordered `JwtAuthGuard → SuspensionGuard → RolesGuard`. Queries `User.suspendedAt` on every non-GET request and returns `USER_SUSPENDED` 403 with the reason in the message. JWTs can't carry live suspension state, so the DB check is per mutating request. `@AllowSuspended()` opts out `/auth/logout`, `/auth/me`, and `POST /reports/:id/appeal` so a suspended user can still sign out, read their own status, and file an appeal.
7. ✅ **Web — moderation console** — `/admin/moderation/reports` report detail now exposes suspend / unsuspend (`USER` target) + takedown / restore (`POST` target) buttons with a shared reason input, and an Appeal block showing status + history + uphold/deny controls when `appealStatus === "PENDING"`. New `runAdminAction` helper funnels all four admin mutations through one error path. Test IDs: `admin-suspend`, `admin-unsuspend`, `admin-takedown`, `admin-restore`, `admin-action-reason`, `admin-appeal-uphold`, `admin-appeal-deny`, `admin-appeal-note`.
8. ✅ **Web — audit search** — new `/admin/audit` page: action select (localized action labels), actor / target user / target post / target report text filters, created-from/to date filters, cursor pagination, and CSV export button (`audit-export-csv`). Mirrors existing moderation console `Surface` patterns.
9. ✅ **Web + Mobile — suspension banner** — authed web layout (`apps/web/src/app/[locale]/(app)/layout.tsx`) and mobile tabs layout (`apps/mobile/app/(app)/_layout.tsx`) both fetch `/auth/me` and render a top-of-shell `SuspensionBanner` whenever `suspendedAt` is set. Copy: `suspension.banner` + `suspension.bannerWithReason` + `suspension.appealCta`. Test ID: `suspension-banner`.
10. ✅ **Copy** — `apps/web/messages/{en,ar,ar-PS}.json` add the full `admin.moderation.admin-actions`, `admin.audit.*` (including `actions.{USER_SUSPEND,USER_UNSUSPEND,POST_TAKEDOWN,POST_RESTORE,REPORT_RESOLVE,REPORT_APPEAL_REVIEW}`), and `suspension.*` blocks. Mobile `apps/mobile/src/i18n/{en,ar}.json` add the `suspension.*` block.

Verification notes:

- `corepack pnpm --filter @palnet/shared type-check` clean.
- `corepack pnpm --filter @palnet/api type-check` clean.
- `corepack pnpm --filter @palnet/web type-check` clean.
- `corepack pnpm --filter @palnet/mobile type-check` clean.
- `corepack pnpm --filter @palnet/db db:generate` — Prisma `EPERM` on `query_engine-windows.dll.node` while a dev server held the DLL open. The admin-depth fields are already in the generated client; re-run once the dev server is stopped for a clean regen.

#### Sprint 14 follow-ups

- **User-side appeal UI** — ✅ shipped in Sprint 15 (`/me/appeals`).
- **Admin post surface** — taken-down posts 404 everywhere, including `/admin/posts/:id`. Add a read-only admin post detail so moderators can inspect the body they took down.
- **AuditLog retention** — the table is append-only and unbounded. Decide retention (likely 1 year + export-to-cold-storage) before it grows past a practical size.
- **Tests** — ✅ shipped in Sprint 15 (AdminService + SuspensionGuard specs).
- **Notifications** — ✅ shipped in Sprint 15 (`MODERATION_*` NotificationType values).

---

### Sprint 15 — Sprint 14 follow-ups (appeals UI + moderation notifications + tests) ✅ IMPLEMENTED

**Goal:** close the three highest-leverage Sprint 14 follow-ups so a suspended / taken-down user has a real path through the product, and moderation logic has baseline unit coverage.

1. ✅ **Shared + Prisma — 5 new `NotificationType` values** — `MODERATION_USER_SUSPENDED`, `MODERATION_USER_UNSUSPENDED`, `MODERATION_POST_TAKEDOWN`, `MODERATION_POST_RESTORED`, `MODERATION_APPEAL_REVIEWED`. Mirrored in `packages/shared/src/enums.ts` and `packages/db/prisma/schema.prisma`. Additive migration `202604240005_moderation_notification_types` uses `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS` so the change is safe on a live enum column.
2. ✅ **API — AdminService emits notifications** — `AdminService` now depends on `NotificationsService` and fires a `notify(...)` after every successful mutation's `$transaction`: `suspendUser` → `MODERATION_USER_SUSPENDED` (`{ reason }`); `unsuspendUser` → `MODERATION_USER_UNSUSPENDED` (optional `{ note }`); `takedownPost` / `restorePost` → post author (select extended with `authorId`); `reviewAppeal` → recipient resolved from the report's target type via new private `resolveAppealRecipient()` helper (select extended to `targetCommentId` + `targetMessageId`). All five types map to `TYPE_TO_EVENT: null` in `notifications.service.ts`, so they bypass the mute-preferences check and are not fanned out to email / push — banner + in-app only.
3. ✅ **API — `GET /reports/mine`** — new `listMyReports(viewerId, query)` on `ModerationService`. Parallel `findMany` on `post` / `comment` / `message` resolves "reports whose target I own", `AND { resolvedAt: { not: null } }` filters to resolved reports only, then projects `AdminReportItem` → `MyReportItem` dropping `reporter` + `resolvedBy` for privacy. Controller route `@Get("reports/mine")` is `@AllowSuspended()` so a suspended user can still see their own history. New shared schemas: `MyReportItem`, `MyReportsListQuery`, `MyReportsPage` (cursor-paged).
4. ✅ **Web — `/me/appeals` page** — `apps/web/src/app/[locale]/(app)/me/appeals/page.tsx`: fetches `/reports/mine`, renders per-report `Surface` card with reason / target excerpt / moderator resolution note / status badge (`PENDING`/`UPHELD`/`DENIED`) / decision note. Not-yet-appealed resolved reports show an inline file-appeal form with a 10-char minimum textarea and `APPEAL_ALREADY_FILED` error mapping. Load-more uses the cursor envelope. Test IDs: `my-appeal-{id}`, `my-appeal-note-{id}`, `my-appeal-submit-{id}`. `SuspensionBanner` in `(app)/layout.tsx` now carries a real `<a href="/me/appeals">` CTA (`suspension-appeal-cta`).
5. ✅ **Copy** — `apps/web/messages/{en,ar,ar-PS}.json` add the full `appeals.*` block (page title/description/empty/loading/error, `targetKind.*`, `status.*`, `reasons.*`, form labels) plus a `moderationNotifications.*` block with 8 keys covering the 5 types (base + `_WITH_REASON` / `_UPHELD` / `_DENIED` variants). All three files re-parsed via `JSON.parse` to guarantee no trailing-comma drift.
6. ✅ **Tests** — `apps/api/src/modules/admin/admin.service.spec.ts` (13 cases) + `apps/api/src/modules/auth/guards/suspension.guard.spec.ts` (7 cases). 22/22 green under `jest --runInBand`. AdminService spec drives Prisma + `NotificationsService` via `jest.fn()` stubs, asserts on `prisma.$transaction.mock.calls[0][0].length` to lock the op-count per mutation (suspend = 3, unsuspend = 3, appeal UPHELD = 3, DENIED = 2), and verifies every mutation emits exactly one notify with the right payload. SuspensionGuard spec stubs `ExecutionContext` + `Reflector` and locks the four decision paths: public (no user) pass, `GET` / `HEAD` pass without DB hit, `@AllowSuspended()` pass without DB hit, non-suspended pass, suspended on `POST` / `PATCH` → `DomainException` with `code: USER_SUSPENDED` and status 403 and the reason in `getResponse().error.message`.

Verification notes:

- `corepack pnpm --filter @palnet/api exec jest --runInBand admin.service.spec suspension.guard.spec` — 22/22 passing.
- `corepack pnpm -r run --if-present type-check` — clean across `@palnet/shared`, `@palnet/db`, `@palnet/ui-tokens`, `@palnet/ui-web`, `@palnet/ui-native`, `@palnet/api`, `@palnet/web`, `@palnet/mobile`.
- Prisma client regen required once after the enum addition (`corepack pnpm --filter @palnet/db db:generate`) to pick up the new `NotificationType` literals in the typed client.

#### Sprint 15 follow-ups

- **Admin post surface** — still the top Sprint 14 leftover. `/admin/posts/:id` should render the taken-down body read-only so moderators can audit their own decisions without 404s.
- **AuditLog retention** — unchanged; still needs a policy decision (1-year rolling + cold-storage export is the obvious default).
- **Mobile appeals UI** — web has `/me/appeals`; mobile still relies on the banner alone. Mirror the page in `apps/mobile` once `ui-native` has a textarea primitive.
- **Email / push for moderation notifications** — currently in-app only (`TYPE_TO_EVENT: null`). If policy shifts to "moderated users always get emailed," lift the types into real `NotificationEvent` values and wire copy.
- **Ownership resolution on `/reports/mine`** — scales by the viewer's post/comment/message count. Fine at MVP; revisit with a denormalized `targetAuthorId` column on `Report` if it becomes a hotspot.

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
| `handoff/docs/design/prototype/*`                 | `docs/design/prototype/*`                 |

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
