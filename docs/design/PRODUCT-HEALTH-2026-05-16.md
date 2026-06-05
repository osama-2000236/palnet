# Baydar — Product Health Report

**Repo:** `osama-2000236/palnet` · **Branch:** `main` · **Generated:** May 16, 2026
**Stack:** Turborepo · pnpm · Next.js 15 (App Router) · Expo SDK 51 · `@baydar/ui-tokens` · `@baydar/ui-web` · `@baydar/ui-native`

---

## 0. Executive summary

The codebase is in **moderately good health for an MVP**. The design-system foundation (`packages/ui-tokens` + `packages/ui-web`) is well-factored, the route surface covers most of the LinkedIn-parity scope (feed, profiles, jobs, messages, employer, onboarding, safety, settings), and the prototype is honored in the production code. The gaps cluster around three areas:

1. **Production resilience** — no global `error.tsx` / `not-found.tsx` / `loading.tsx` anywhere in the App Router; client-side data-fetching pages render blank during bootstrap and swallow errors silently in places (e.g. `feed/page.tsx`).
2. **Token + style drift** — `apps/web/src/app/globals.css` hard-codes the same hex values that `packages/ui-tokens/src/tokens.css` exports, with no import linkage. Spacing scale, focus-ring, semantic `*-soft` variants, and avatar palettes live only in TS, not CSS.
3. **Monolith pages** — `messages/page.tsx` (38 KB), `me/edit/page.tsx` (21 KB), and `messages/[roomId].tsx` mobile (24 KB) violate the "small file" rule and concentrate state, re-renders, and bugs.

Each is fixable in **<1 sprint** and unblocks a "v1 GA" candidate.

---

## 1. Inventory

### 1a. Routes — Web (`apps/web/src/app/[locale]/`)

| Group              | Routes                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Marketing**      | `/` (landing — minimal), `/(public)/legal/{tos, privacy, community, employer}`                                            |
| **Auth**           | `/login`, `/register`, `/forgot-password`, `/reset-password/[token]`, `/verify-email/[token]`                             |
| **App core**       | `/feed`, `/in/[handle]`, `/network`, `/notifications`, `/search`, `/onboarding`                                           |
| **Profile (self)** | `/me/edit`, `/me/karama`                                                                                                  |
| **Jobs**           | `/jobs`, `/jobs/[id]`                                                                                                     |
| **Employer**       | `/employer`, `/employer/new`, `/employer/[slug]`, `/employer/[slug]/jobs/new`, `/employer/[slug]/jobs/[jobId]/applicants` |
| **Messages**       | `/messages`, `/messages/new`                                                                                              |
| **Settings**       | `/settings`, `/settings/account`, `/settings/blocked`                                                                     |
| **Admin**          | `/(admin)/billing`, `/(admin)/moderation`                                                                                 |

### 1b. Routes — Mobile (`apps/mobile/app/`)

Parity with web minus admin & legal. Adds in-shell `composer.tsx` and per-room screen `messages/[roomId].tsx`.

### 1c. Shared component library

| Package                   | Exports                                                                                                                                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@baydar/ui-tokens`       | `tokens.css`, `tokens.native.ts`, `tailwind-preset.ts`, `logo-mark.svg`                                                                                                                                                                                                                               |
| `@baydar/ui-web`          | `AppShell`, `Avatar`, `Button`, `Composer`, `EmptyState`, `Icon`, `Illustration`, `MessageBubble`, `OnboardingProgress`, `PostCard`, `PostCardSkeleton`, `RoomRow`, `Surface`, `Tabs`, `Toast` + provider, `TypingIndicator`, `ReportDialog`, `BlockButton`, `BlockedListItem`, `groupMessages`, `cx` |
| `apps/web/src/components` | `Comments`, `Composer` (wrapper), `ConnectButton`, `NotificationsBell`, `PostCard` (wrapper), `ToastBridge`                                                                                                                                                                                           |

### 1d. Global styles

- `packages/ui-tokens/src/tokens.css` — generated; canonical source.
- `apps/web/src/app/globals.css` — Tailwind base + **manually re-declares every token** (drift risk, see §3).
- Tailwind preset wires tokens into utility classes via `packages/ui-tokens/tailwind-preset.ts`.

---

## 2. Missing screens

| #   | Screen                                                       | Why it matters                                                                                                                  | Priority |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **`app/error.tsx`** (root) + per-segment error boundaries    | Any uncaught render throws today produce a blank page in prod                                                                   | 🔴 P0    |
| 2   | **`app/not-found.tsx`** (404)                                | Invalid handle (`/in/nope`), bad job ID, deleted post — currently rely on body-level "no data" UI; no real 404 page             | 🔴 P0    |
| 3   | **`app/[locale]/(app)/loading.tsx`**                         | All `(app)` routes are `"use client"` and read session client-side → blank flash before skeleton                                | 🔴 P0    |
| 4   | **`/me`** (self profile view)                                | Only `/me/edit` and `/me/karama` exist. Users hit own profile via `/in/[handle]` which works but isn't discoverable from chrome | 🟠 P1    |
| 5   | **`/me/connections`**                                        | `/network` shows suggestions only — no list of _accepted_ connections                                                           | 🟠 P1    |
| 6   | **`/settings/notifications`**                                | Push/email preference matrix — required before turning on transactional email                                                   | 🟠 P1    |
| 7   | **`/settings/privacy`**                                      | Profile visibility, who can message, who can see connections                                                                    | 🟠 P1    |
| 8   | **`/settings/security`**                                     | Change password + (later) 2FA. `account` covers email/handle only                                                               | 🟠 P1    |
| 9   | **`/saved`** (bookmarks)                                     | `bookmark` icon ships in `Icon.tsx` but has no destination route                                                                | 🟡 P2    |
| 10  | **`/employer/[slug]/billing`**                               | Admin billing is global; per-org billing surface is missing                                                                     | 🟡 P2    |
| 11  | **Session-expired re-auth modal**                            | Token refresh flow inside `apiFetch` is unclear; no UX for soft expiry                                                          | 🟠 P1    |
| 12  | **Offline / network error full-screen**                      | No `useOnline()` banner or retry screen for spotty connections                                                                  | 🟡 P2    |
| 13  | **Empty states for `/notifications`, `/search`, `/network`** | Need verification — `EmptyState` primitive exists but coverage is per-page                                                      | 🟡 P2    |
| 14  | **Real marketing landing**                                   | `/[locale]/page.tsx` is one H1 + CTA. Pre-launch needs hero, value props, employer track, social proof                          | 🟠 P1    |
| 15  | **Onboarding completion / success screen**                   | `/onboarding` exists; an explicit "you're set" celebration before first `/feed` would lift activation                           | 🟡 P2    |

---

## 3. Design-system gaps

| Token / system                            | Status                                                                  | Gap                                                                                                                            | Fix                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Brand / accent / ink / surface / line** | ✅ Complete in `tokens.css`                                             | None                                                                                                                           | —                                                                                                           |
| **`--space-*` (4 → 64 px scale)**         | ⚠️ Defined in TS (`tokens.space`) and Tailwind preset only              | Not emitted into `tokens.css` — raw CSS authors must hard-code px                                                              | Add `--space-0..--space-24` to `tokens.css`                                                                 |
| **Semantic `*-soft` variants**            | ⚠️ Guide references `--success-soft`, `--warning-soft`, `--danger-soft` | Not defined in `tokens.css` — `feed/page.tsx` uses ad-hoc `bg-success/10` opacities                                            | Add `--success-soft`, `--warning-soft`, `--danger-soft`, `--info-soft`                                      |
| **Focus ring**                            | ❌ Missing                                                              | Each page declares its own `focus:ring-brand-500/20` — no single source                                                        | Add `--focus-ring: 0 0 0 2px var(--brand-500); --focus-ring-offset: 2px;`                                   |
| **Shadow scale**                          | ⚠️ Only `card` and `pop`                                                | Missing `nav` (sticky chrome), `modal`, `inline-hover`                                                                         | Add `--shadow-nav`, `--shadow-modal`                                                                        |
| **Avatar palettes**                       | ⚠️ Defined in `Avatar.tsx` JS only                                      | Guide promises 5 palettes (olive, terracotta, sunken, green-tint, warm-brown); not as CSS vars                                 | Hoist to `--avatar-palette-{1..5}-bg / -fg`                                                                 |
| **Breakpoints**                           | ⚠️ `--bp-md/-lg/-xl` defined                                            | Missing `--bp-sm` (640 px)                                                                                                     | Add `--bp-sm: 640px`                                                                                        |
| **Typography utility classes**            | ✅ via Tailwind `fontSize` extensions                                   | OK for Tailwind, but raw-CSS authors have no `.t-h1` etc.                                                                      | Optional — add utility classes for non-Tailwind contexts (RSS, email)                                       |
| **Motion**                                | ⚠️ Durations + 2 eases                                                  | No spring tokens, no stagger                                                                                                   | Add `--ease-spring`, `--stagger-step` if/when needed                                                        |
| **Dark mode**                             | ❌ Not designed                                                         | Acknowledged "not yet" in `tokens.css`                                                                                         | Out of scope for v1 — track                                                                                 |
| **Data-viz palette**                      | ❌ Missing                                                              | No charts yet, but Karama trust score / employer applicant stats will need one                                                 | Defer until first chart                                                                                     |
| **Container / grid**                      | ⚠️ `--max-w: 1128px` exists                                             | No content-width tokens (`--w-narrow`, `--w-prose`)                                                                            | Add when 2nd width is needed                                                                                |
| **Token source-of-truth**                 | 🔴 **Drift risk**                                                       | `apps/web/src/app/globals.css` re-declares every color/radius/shadow rather than importing `@baydar/ui-tokens/tokens.css`      | Replace duplicated `:root {}` block with `@import "@baydar/ui-tokens/dist/tokens.css"` (or path equivalent) |
| **Font tokens**                           | 🔴 **Drift risk**                                                       | `globals.css` references legacy `--font-naskh`, `--font-sans-arabic`; canonical is `--font-sans`, `--font-body`, `--font-mono` | Unify to canonical names                                                                                    |

---

## 4. Implementation risks

| Area                                                                        | File(s)                                                                                   | Risk                                                                                                                     | Severity |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| **No App Router error boundary**                                            | `apps/web/src/app/**`                                                                     | Render throws → blank prod page                                                                                          | 🔴 P0    |
| **No App Router `loading.tsx`**                                             | `(app)/**`                                                                                | Every protected route paints blank before client `useEffect` reads session                                               | 🔴 P0    |
| **Feed swallows fetch errors**                                              | `apps/web/src/app/[locale]/(app)/feed/page.tsx`                                           | `load()` has `try/finally` with no `catch` — initial load failure leaves user on infinite empty                          | 🔴 P0    |
| **Suggestions / jobs rail fail silently**                                   | feed `page.tsx` lines 76–88                                                               | `.catch(() => setX([]))` — distinguishable from "really empty" only by absence; no retry CTA                             | 🟠 P1    |
| **Monolith — Messages**                                                     | `apps/web/.../messages/page.tsx` (37,972 bytes)                                           | Inbox + composer + room rendering all in one client component. Hurts maintainability, code-split, re-render perf         | 🔴 P0    |
| **Monolith — Profile editor**                                               | `apps/web/.../me/edit/page.tsx` (20,858 bytes)                                            | Single client form, no schema splits per section                                                                         | 🟠 P1    |
| **Monolith — Mobile room**                                                  | `apps/mobile/app/(app)/messages/[roomId].tsx` (24,219 bytes)                              | Same as above on RN                                                                                                      | 🟠 P1    |
| **Monolith — Mobile onboarding**                                            | `apps/mobile/app/(app)/onboarding.tsx` (40,930 bytes)                                     | 40 KB single-file flow on RN — very hard to QA in isolation                                                              | 🟠 P1    |
| **Duplicated components**                                                   | `apps/web/src/components/{PostCard,Composer}.tsx` vs `@baydar/ui-web/{PostCard,Composer}` | Two sources of truth — wrapping vs forking is unclear without inspection                                                 | 🟠 P1    |
| **Token duplication**                                                       | `apps/web/src/app/globals.css` vs `packages/ui-tokens/src/tokens.css`                     | Designers update one, the other drifts — already see legacy font vars in `globals.css`                                   | 🔴 P0    |
| **Client-side session reads everywhere**                                    | every `(app)/*/page.tsx`                                                                  | `readSession()` in `useEffect` → push to `/login`. Means there is no SSR-protected route; SEO + first-paint cost         | 🟠 P1    |
| **Admin role-gating not visible at route level**                            | `(admin)/billing`, `(admin)/moderation`                                                   | No `middleware.ts` rule found scoping `(admin)`. Need to confirm server checks in API; UI layer should refuse render too | 🔴 P0    |
| **No 401-refresh interceptor visible**                                      | `apps/web/src/lib/api.ts`                                                                 | Token expiry behavior undocumented — user may see raw 401 errors                                                         | 🟠 P1    |
| **No keyboard focus management on dialogs**                                 | `safety.tsx` (`ReportDialog`)                                                             | Need to verify focus trap + return-focus — Radix usage in repo is partial                                                | 🟠 P1    |
| **Numeric direction enforcement**                                           | various                                                                                   | Guide mandates LTR numerals inside Arabic text; no util enforces it (no `<bdi>` wrapper, no `--numeral-direction`)       | 🟡 P2    |
| **No skeletons for profile / messages**                                     | `in/[handle]`, `messages/*`                                                               | Only `PostCardSkeleton` exists; other long-load pages flash blank                                                        | 🟠 P1    |
| **`globals.css` uses legacy font CSS vars**                                 | `apps/web/src/app/globals.css` line `font-family: var(--font-naskh)...`                   | Vars not defined in canonical tokens — likely fed by `next/font` aliases but undocumented                                | 🟠 P1    |
| **No `useOnline`/network-error UX**                                         | global                                                                                    | Mobile especially — Expo app on flaky cellular shows nothing                                                             | 🟡 P2    |
| **Lighthouse baselines exist but no perf budget enforcement in CI visible** | `apps/web/lighthouserc*.json`                                                             | Configs are present but only useful if blocked on regression — confirm CI step                                           | 🟡 P2    |
| **Composer + PostCard wrappers exist app-side**                             | `apps/web/src/components/*`                                                               | Either consolidate into `ui-web` (preferred) or document why a wrapper is needed                                         | 🟡 P2    |
| **Mixed marketing surface**                                                 | `/[locale]/page.tsx`                                                                      | Single-screen landing won't convert paid traffic; not a "risk" today but a launch blocker                                | 🟠 P1    |

---

## 5. Recommended sprint plan (2 weeks)

### Week 1 — Resilience & token unification

- [ ] Add `app/error.tsx`, `app/not-found.tsx`, `app/[locale]/(app)/loading.tsx`, `app/[locale]/(app)/error.tsx`.
- [ ] Replace duplicated `:root {}` in `globals.css` with `@import "@baydar/ui-tokens/dist/tokens.css"`.
- [ ] Emit `--space-*`, `--success-soft` / `--warning-soft` / `--danger-soft` / `--info-soft`, `--focus-ring`, avatar palette vars into `tokens.css`.
- [ ] Add a `catch` branch + retry CTA to `feed/page.tsx` and the two rail fetches.
- [ ] Verify (or add) middleware role-gating on `(admin)/*`.

### Week 2 — Split monoliths, fill missing screens

- [ ] Split `messages/page.tsx` into `InboxList`, `RoomView`, `RoomComposer`, `MessageList` modules.
- [ ] Split `me/edit/page.tsx` into per-section components (`BasicsForm`, `ExperienceList`, `EducationList`, `SkillsEditor`).
- [ ] Ship `/me`, `/me/connections`, `/settings/notifications`, `/settings/security`, `/settings/privacy`.
- [ ] Real `/[locale]/page.tsx` landing (hero + 3 value props + employer track + footer).

### Stretch — Discovery polish

- [ ] `/saved` (bookmarks) route + saved-post API.
- [ ] `useOnline` global banner.
- [ ] Onboarding completion celebration before `/feed` redirect.

---

## 6. Appendix — Files referenced

```
packages/ui-tokens/src/tokens.css
packages/ui-tokens/tailwind-preset.ts
packages/ui-web/src/index.ts
apps/web/src/app/globals.css
apps/web/src/app/[locale]/page.tsx
apps/web/src/app/[locale]/(app)/feed/page.tsx
apps/web/src/app/[locale]/(app)/jobs/page.tsx
apps/web/src/app/[locale]/(app)/messages/page.tsx       (37,972 bytes)
apps/web/src/app/[locale]/(app)/me/edit/page.tsx        (20,858 bytes)
apps/mobile/app/(app)/messages/[roomId].tsx             (24,219 bytes)
apps/mobile/app/(app)/onboarding.tsx                    (40,930 bytes)
```
