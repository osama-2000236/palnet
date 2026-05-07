# Pre-Design-Pass Bugs — Root Cause + Fix

> 4 launch-blocking issues found in snapshot walk. Engineering fix, not design.
> Fix all before re-running `node scripts/capture-snapshots.mjs` and shipping bundle.

---

## Bug 1 — `/ar-PS/settings` returns 404

**Root cause**

`apps/web/src/app/[locale]/(app)/settings/` contains only `account/` and `blocked/` subdirs. No `page.tsx` at the root. Next.js App Router → no index → 404.

```
apps/web/src/app/[locale]/(app)/settings/
├── account/page.tsx     ← exists
└── blocked/page.tsx     ← exists
                         ← MISSING: page.tsx (settings index)
```

Mobile parity has the same shape (`apps/mobile/app/(app)/settings/account.tsx`, `blocked.tsx`, no index).

**Fix**

Add `apps/web/src/app/[locale]/(app)/settings/page.tsx` — settings landing page that links to:

- Account (`/settings/account`)
- Blocked users (`/settings/blocked`)
- Future: Notifications, Language, Sign out

Use the `row`/`flat` surface pattern from `DESIGN.md §5.6`. One link per row, leading icon, trailing chevron (mirrored in RTL).

Mirror the same structure for mobile at `apps/mobile/app/(app)/settings/index.tsx`.

**Verify**

```powershell
curl http://localhost:3000/ar-PS/settings -I
# Expect: HTTP/1.1 200 OK
```

---

## Bug 2 — Search tabs render as raw i18n keys

**Root cause**

`apps/mobile/app/(app)/search.tsx:50-52` uses keys `search.tabs.people`, `search.tabs.posts`, `search.tabs.jobs`.

`apps/web/messages/`:

- `en.json:205-209` ✓ has `tabs.{people,posts,jobs}`
- `ar.json:167-171` ✓ has `tabs.{people,posts,jobs}`
- `ar-PS.json:162-170` ✗ MISSING `tabs.*` block entirely

Playwright + middleware default locale = `ar-PS`. Page renders. next-intl can't resolve key. Falls back to printing the key.

**Fix**

Add to `apps/web/messages/ar-PS.json` inside the `"search"` block (after line 169, before closing `}`):

```json
    "tabs": {
      "people": "الأشخاص",
      "posts": "المنشورات",
      "jobs": "الوظائف"
    },
    "empty": {
      "people": "لا يوجد أشخاص يطابقون البحث.",
      "posts": "لا توجد منشورات تطابق البحث.",
      "jobs": "لا توجد وظائف تطابق البحث."
    },
```

Also audit `ar-PS.json` against `ar.json` for any other missing keys — risk that more strings degrade silently.

**Verify**

```powershell
node -e "const a=require('./apps/web/messages/ar.json'); const b=require('./apps/web/messages/ar-PS.json'); const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?flat(v,p+k+'.'):[p+k]); const A=new Set(flat(a)); const B=new Set(flat(b)); const missing=[...A].filter(k=>!B.has(k)); console.log('missing in ar-PS:', missing.length); missing.forEach(k=>console.log(' -',k));"
```

---

## Bug 3 — Jobs shows raw `API 403 PROFILE_ONBOARDING_REQUIRED`

**Root cause**

`apps/web/src/app/[locale]/(app)/jobs/page.tsx:99` catches the error and renders `(e as Error).message` raw. The API throws `ApiRequestError` (`apps/web/src/lib/api.ts:6-14`) whose `message = "API ${status} ${code}"`. Tinted surface (line 204-206) prints it directly.

Mobile already has friendly mapping:

- `apps/mobile/src/i18n/ar.json:233` — `"PROFILE_ONBOARDING_REQUIRED": "أكمل ملفك المهني أولًا حتى تتابع."`
- `apps/mobile/src/i18n/en.json:231` — `"Complete your professional profile before continuing."`

Web has no equivalent.

**Fix**

1. Add error namespace to `apps/web/messages/{ar-PS,ar,en}.json`:

```json
"errors": {
  "PROFILE_ONBOARDING_REQUIRED": "أكمل ملفك المهني أولًا حتى تتابع.",
  "UNAUTHORIZED": "يجب تسجيل الدخول.",
  "FORBIDDEN": "ليس لديك صلاحية.",
  "NOT_FOUND": "غير موجود.",
  "INTERNAL": "حدث خطأ. حاول مرة أخرى.",
  "NETWORK": "تعذّر الاتصال بالخادم.",
  "fallback": "حدث خطأ غير متوقع."
}
```

(Translate per locale.)

2. Update `apps/web/src/app/[locale]/(app)/jobs/page.tsx:98-99`:

```typescript
import { ApiRequestError } from "@/lib/api";
// ...
} catch (e) {
  if (e instanceof ApiRequestError && e.code === "PROFILE_ONBOARDING_REQUIRED") {
    router.replace(`/${locale}/onboarding?return=/jobs`);
    return;
  }
  const tErr = useTranslations("errors");
  const code = e instanceof ApiRequestError ? e.code : "fallback";
  setError(tErr.has(code) ? tErr(code) : tErr("fallback"));
}
```

3. Promote pattern to a shared helper `apps/web/src/lib/error-message.ts` so other screens (feed, network, messages, notifications, search) can share. Audit each for the same raw-error issue.

**Verify**

Visit `/ar-PS/jobs` as a user without completed profile. Expect: redirect to onboarding, OR friendly Arabic error. Never `API 403 ...`.

---

## Bug 4 — Dev overlay shows `1 error` / `7 errors` on multiple screens

**Root cause (most likely)**

Cascade from bugs 1-3:

- Each missing i18n key throws via `next-intl` strict mode (`<= 1 error per missing key per render`).
- Search has 7 errors → `tabs.people`, `tabs.posts`, `tabs.jobs`, `empty.people`, `empty.posts`, `empty.jobs`, possibly one more.
- Jobs/Notifications/Network show 1 error each → likely the same missing-key issue from another namespace, OR the API failure from Bug 3 propagating.

**Fix**

Fix bugs 1-3 first. Then:

```powershell
# Restart web dev
pnpm --filter @baydar/web dev
# Visit each screen. Open browser devtools console. Count remaining errors.
```

If errors persist after fixes 1-3, capture them via:

```powershell
node scripts/capture-console.mjs    # write a small playwright script to dump console.error per route
```

(Worth writing a `scripts/capture-console.mjs` companion to `capture-snapshots.mjs` so this is a one-shot check before every snapshot pass.)

**Verify**

Re-run `node scripts/capture-snapshots.mjs`. Open any captured PNG. Bottom-left dev overlay should show **0 errors** (no badge) on every screen.

---

## Sequence

1. Bug 2 — translation drop, lowest risk, clears 7 of the visible errors immediately.
2. Bug 1 — add `settings/page.tsx` index.
3. Bug 3 — add error namespace + helper, update jobs handler. Audit other screens for same pattern.
4. Bug 4 — should be cleared by 1+2+3. Re-snapshot. If anything remains, investigate per-route.

After all 4 → re-run `node scripts/capture-snapshots.mjs` → snapshots replace existing 60 PNGs in `04-screens/*/web/`.

---

## Tracking

| Bug                  | Owner  | Status                                                                                                                                                              |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 settings 404       | claude | **VERIFIED FIXED** (snapshot 04-screens/settings/web/desktop-ar-PS-default.png shows landing)                                                                       |
| 2 search i18n keys   | claude | **VERIFIED FIXED** (snapshot 04-screens/search/web/desktop-ar-PS-default.png shows Arabic tabs)                                                                     |
| 3 jobs raw error     | claude | **VERIFIED FIXED** — friendly i18n + redirect to /onboarding on `PROFILE_ONBOARDING_REQUIRED`. Snapshot shows skeletons (mid-redirect), no raw `API 403 ...` string |
| 4 dev overlay errors | claude | **partially fixed** — search dropped 7→0 errors; cascade should drop other screens too (verified search snapshot has no error badge)                                |

## Bug 3 implementation

**Files changed**

- `apps/web/messages/{ar-PS,ar,en}.json` — added top-level `errors` namespace with PROFILE_ONBOARDING_REQUIRED + UNAUTHORIZED + FORBIDDEN + NOT_FOUND + RATE_LIMITED + VALIDATION_FAILED + INTERNAL + NETWORK + fallback.
- `apps/web/src/lib/error-message.ts` — NEW helper: `toErrorMessage(error, t)` + `getErrorCode(error)`. Maps `ApiRequestError.code` → `errors.{code}` translation, fallback to `errors.fallback`. Also handles `TypeError` (fetch network failures) → `errors.NETWORK`.
- `apps/web/src/app/[locale]/(app)/jobs/page.tsx` — catches `PROFILE_ONBOARDING_REQUIRED`, redirects to `/onboarding?return=/jobs`. Other errors → `toErrorMessage(e, tErr)`.
- `apps/web/src/app/[locale]/(app)/jobs/[id]/page.tsx` — same pattern: detail load redirects on `PROFILE_ONBOARDING_REQUIRED`, ApplyDialog uses `toErrorMessage`.

**Audit result (other raw-error screens)**

Searched `apps/web/src/app` for `(e as Error).message`. Findings:

- jobs/page.tsx — fixed.
- jobs/[id]/page.tsx — fixed (2 spots).
- All other screens (auth, onboarding, messages, me/edit, messages/new) already use scoped fixed-key translations or namespace-correct error keys. No raw-error leak.

**Validation**

- `pnpm --filter @baydar/web type-check` — clean.
- `pnpm lint:tokens` — clean.

**Verification**

- Snapshot `04-screens/jobs/web/desktop-ar-PS-default.png` shows skeleton placeholders during redirect (no raw `API 403` string visible).
- Snapshot has no `1 error` dev overlay badge.

## Verification root cause

Initial verification failed because `.claude/dev-web.cmd` ran Next.js dev server from `C:\LinkedIn\apps\web` (main checkout) instead of `C:\LinkedIn\.claude\worktrees\eloquent-yonath-6c4db3\apps\web` (this worktree). All worktree edits were invisible to the running server. ALL 60 PNGs in `04-screens/` captured before this session reflect main-checkout state.

**Fix applied**: Updated `.claude/dev-web.cmd` to point both `cd` and `next.cmd` paths at the worktree.

```cmd
@echo off
cd /D "C:\LinkedIn\.claude\worktrees\eloquent-yonath-6c4db3\apps\web"
call "C:\LinkedIn\.claude\worktrees\eloquent-yonath-6c4db3\apps\web\node_modules\.bin\next.cmd" dev
```

After redirect + restart + `.next` cache clear, both bugs render correctly.

## Implemented (this session)

**Bug 2 fix**

- `apps/web/messages/ar-PS.json` — merged missing 31 keys from `ar.json` (auth.errors._, auth.verify._, auth.forgot._, auth.reset._, search.tabs._, search.empty._).
- Drift script run post-merge: `missing in ar-PS: 0`.

**Bug 1 fix**

- `apps/web/src/app/[locale]/(app)/settings/page.tsx` — settings landing, web. Lists Account + Blocked rows with row-divider pattern, hover tint, RTL chevron.
- `apps/mobile/app/(app)/settings/index.tsx` — settings landing, mobile. Same shape via `Surface variant="flat"` + `Pressable` rows + safe area + native tokens.
- `apps/web/messages/{ar-PS,ar,en}.json` — added `settings` namespace (`title`, `subtitle`, `items.{account,accountDesc,blocked,blockedDesc}`).
- `apps/mobile/src/i18n/{ar,en}.json` — same `settings` namespace.

**Validation passed**

- `pnpm --filter @baydar/web type-check` — clean.
- `pnpm --filter @baydar/mobile type-check` — clean (after fixing `padding={0}` → `padding="0"` per `SurfacePadding` type).
- `pnpm lint:tokens` — clean.

**Verification gap**

- `node scripts/capture-snapshots.mjs` re-run captured stale state — dev server (PID 1412) has stale route + message map. To verify: restart `pnpm --filter @baydar/web dev` then re-run the capture script.
