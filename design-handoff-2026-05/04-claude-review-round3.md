# Claude Review — Round 3

Reviewer: Claude Code Opus (in-session, plan author + direct driver).
Codex round: 3 / 3.
Codex attempt: **failed** — auth `TokenRefreshFailed` on the MCP transport
(twice in a row, even after a fresh `codex login`). No files produced.
Claude switched to direct-drive mode per user choice.

## Plan items

A. Feed 401 handling + cascade audit — required.
B. Pain-inventory second-pass critique — required.
C. Native iOS sim + Android emu captures — explicitly deferred.

## Item A — feed 401 handling

**Audit result:** 5 authenticated pages were calling `apiFetchPage` /
`apiFetch` without an `ApiRequestError`-aware catch. Round 1's
`jobs/page.tsx` was the only one that handled `PROFILE_ONBOARDING_REQUIRED`,
and even it didn't redirect on `AUTH_UNAUTHORIZED`.

Pages fixed:

- `apps/web/src/app/[locale]/(app)/feed/page.tsx`
- `apps/web/src/app/[locale]/(app)/network/page.tsx`
- `apps/web/src/app/[locale]/(app)/notifications/page.tsx`
- `apps/web/src/app/[locale]/(app)/messages/page.tsx` (both `loadRooms` and `loadMessages`)
- `apps/web/src/app/[locale]/(app)/jobs/page.tsx` (extended to also redirect on `AUTH_UNAUTHORIZED`)

Pattern (uniform across all 5):

```typescript
} catch (e) {
  const code = getErrorCode(e);
  if (
    code === "AUTH_UNAUTHORIZED" ||
    code === "UNAUTHORIZED" ||
    (e instanceof ApiRequestError && e.status === 401)
  ) {
    router.replace(`/login?return=${encodeURIComponent("/feed")}`);
    return;
  }
  if (code === "PROFILE_ONBOARDING_REQUIRED") {
    router.replace(`/${locale}/onboarding?return=${encodeURIComponent("/feed")}`);
    return;
  }
  setError(toErrorMessage(e, tErr)); // when the page has a setError; otherwise omit
}
```

- Reused existing `toErrorMessage` + `getErrorCode` from `apps/web/src/lib/error-message.ts`.
- Reused existing `errors` namespace keys in `apps/web/messages/*.json`. No new helpers, no new keys.
- The 401-by-status fallback (`e.status === 401`) handles the case where the
  API returns a non-mapped error code on a 401 (defensive).

## Item A — QA evidence

- `pnpm --filter @baydar/web type-check` — clean.
- `pnpm lint:tokens` — clean.
- `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts` — 26 passed, 16 skipped (job-detail conditional, no seeded jobs), 0 failed.
- `node scripts/probe-feed-errors.mjs` (fresh fixture) — `ERRORS COUNT: 0`.
- `node scripts/probe-feed-invalid-session.mjs` (intentionally-garbage session) — `final URL: http://localhost:3000/ar-PS/login`, `pageerror count: 0`, `console.error count: 0`, **PASS**. Verifies the redirect path, not just the absence of throw.
- `node scripts/capture-snapshots.mjs` — `captured=60 failed=0`.
- Visual spot-check of `04-screens/feed/web/desktop-ar-PS-default.png` — no `1 error` overlay badge.

## Item B — pain-inventory critique

Appended `## AI-assisted second-pass critique (round 3)` to
`design-handoff-2026-05/08-pain.md`. One paragraph per round-2 finding:

- **1 retracted:** feed dev-status badge — closed by Item A.
- **2 weakened:** onboarding bare form (DESIGN.md §11.1 documents the decision; overstated), auth-register terms consent ("visually detached" is wrong; copy is small but adjacent).
- **7 stand:** feed mobile nav cramped, jobs filters mobile drop, messages mobile two-pane, network empty state, notifications empty state, search mobile compressed.

The retraction caught a snapshot mismatch (jobs empty-state finding cited a
PNG that actually shows populated jobs). The weakenings caught the
inventory overstating two findings against the design system's own
documented decisions.

Section header notes "AI-assisted, lead review pending" — the critique
does not replace human design judgment.

## Item C — native captures

Out of scope. Surfaced in `questions[]` of round-2 packet and the
round-2 STATUS as a remaining gate. Hardware-dependent:

- iOS sim impossible on this Windows worktree (needs macOS + Xcode).
- Android emu possible but requires Android Studio + an AVD + a local
  Expo dev build (`eas build --profile development` or `expo run:android`).
  Codex sandbox can neither install nor verify those.

Expo Web proxies in `04-screens/{screen}/mobile/expo-web-*.png` (round 2)
remain the bundle's mobile evidence. They are clearly labeled with the
`expo-web-` prefix and disclaimed in `02-codex-implementation-round2.md`
risks.

## Drift caught

None. All file changes are within plan scope:

- 5 `apps/web/src/app/[locale]/(app)/{feed,network,notifications,messages,jobs}/page.tsx` (Item A).
- `design-handoff-2026-05/08-pain.md` (Item B).
- `scripts/probe-feed-invalid-session.mjs` (new — invalidated-session probe for Item A's acceptance criterion).
- `design-handoff-2026-05/04-screens/*/web/*.png` (60 PNGs re-captured for verification of success criterion 3).
- `design-handoff-2026-05/codex-plan-round3.md`, `codex-prompt-round3.md` (plan artifacts).
- `design-handoff-2026-05/04-claude-review-round3.md` (this file).

Notes on Codex packet:

- No round-3 Codex packet exists — Codex CLI's auth was non-functional
  during this round. The plan + the prompt + this review are the audit
  trail. Claude took the implementer role per user authorization.

## Plan compliance

- ✅ Item A consistent with the round-1 `jobs/page.tsx` pattern; helper-reuse only.
- ✅ Item A cascade audited before editing — 5 affected pages identified, all fixed in one pass.
- ✅ Item B critique honest — 3 of 10 findings did not get "stands".
- ✅ Item C deferred with explicit pre-reqs.
- ✅ No new dependencies, no new tokens, no test weakening.
- ✅ `pnpm format:check` clean.

## Decision

All three round-3 items addressed:

- A — feed 401 fixed across 5 pages, probe verifies redirect not throw.
- B — second-pass critique landed with retractions + weakenings, not boilerplate.
- C — explicitly deferred with pre-reqs.

The bundle's `1 error` dev-overlay regression is closed. The pain
inventory now has an honest self-audit. Only native mobile captures
remain as an environment-blocked gate, which is acceptable for the
design pass.

STATUS: APPROVED
