# Codex Handoff Plan — Round 3

## Context

Rounds 1+2 landed on PR #22. Three outstanding items from the round-2 closeout:

1. Feed 401 handling — `apps/web/src/app/[locale]/(app)/feed/page.tsx` throws
   unhandled `ApiRequestError: API 401 AUTH_UNAUTHORIZED` on access-token
   expiry; surfaces as the `1 error` Next-dev overlay. Documented in
   `08-problems.md` repo-specific addenda.
2. Real native iOS sim + Android emu mobile captures — Expo Web proxies are
   already shipped in `04-screens/{screen}/mobile/expo-web-*.png`; native
   captures would replace them.
3. Lead human review of the AI-assisted `08-pain.md` Lead additions.

This round hands off the **tractable** subset to Codex and explicitly defers
the hardware-gated one. The three items as scoped here:

- **Item A (was 1):** code fix for feed 401 + audit other authed pages.
- **Item B (was 3):** Codex-as-second-reviewer sanity pass over its own
  round-2 `08-pain.md` Lead additions. Flag entries that look overstated,
  imprecise, or wrong. **Does not replace** the lead's review; it's a
  cross-check.
- **Item C (was 2):** out of scope. iOS sim is impossible on Windows and
  Android emu requires AVD + Expo dev build state Codex can't verify or
  set up. Plan surfaces this to the user with a remaining-gate note.

## Goal

Land the only remaining code fix the bundle needs (feed 401) and a
quality-control pass on the AI-assisted pain inventory. Leave native
mobile captures explicitly user-gated.

## Success criteria

1. `apps/web/src/app/[locale]/(app)/feed/page.tsx` (and any other authed
   page calling `apiFetchPage` without error mapping) handles
   `ApiRequestError` with the `toErrorMessage`/redirect pattern already
   used in `apps/web/src/app/[locale]/(app)/jobs/page.tsx`. Specifically:
   - On `PROFILE_ONBOARDING_REQUIRED` → redirect to `/onboarding`.
   - On `AUTH_UNAUTHORIZED` / 401 → redirect to `/login?return={current path}`.
   - On other errors → surface via `toErrorMessage` (no raw `API NNN CODE` strings).
2. `node scripts/probe-feed-errors.mjs` returns `ERRORS COUNT: 0` even
   when the auth fixture is intentionally invalidated (set
   `localStorage["baydar.session.v1"]` to garbage in the probe, then
   reload). The redirect to `/login` is the expected outcome.
3. `node scripts/capture-snapshots.mjs` re-captures the 60 PNGs with no
   visible dev-overlay badge on any route in either locale.
4. `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts` —
   26 passed, 16 skipped, 0 failed.
5. `pnpm format:check` clean.
6. `design-handoff-2026-05/08-pain.md` includes a new
   `## AI-assisted second-pass critique (round 3)` section that
   names each AI-authored finding by snapshot path and either confirms
   it stands, weakens its claim, or retracts it with reason. Length:
   one short paragraph per finding, **not** boilerplate.

## In scope

### Item A — feed 401 handling

**Reference implementation:** the round-1 fix in
`apps/web/src/app/[locale]/(app)/jobs/page.tsx` and the helper at
`apps/web/src/lib/error-message.ts` (`toErrorMessage`,
`getErrorCode`). Read both before editing.

**Audit:** before changing feed, search the authed app for any page
that calls `apiFetchPage` and renders `(e as Error).message` raw, or
catches `ApiRequestError` without redirecting on
`AUTH_UNAUTHORIZED` / `PROFILE_ONBOARDING_REQUIRED`. Use Grep with the
pattern `(e as Error).message` and the pattern `apiFetchPage`. Surface
the audit result in the packet `diff_summary` so the reviewer can verify
the fix is consistently applied (or surface as `questions[]` if cascade
is wider than feed).

**Files likely to touch:**

- `apps/web/src/app/[locale]/(app)/feed/page.tsx`
- Possibly `apps/web/src/app/[locale]/(app)/network/page.tsx`,
  `apps/web/src/app/[locale]/(app)/messages/page.tsx`,
  `apps/web/src/app/[locale]/(app)/notifications/page.tsx`,
  `apps/web/src/app/[locale]/(app)/search/page.tsx`
  — only if the audit shows the same gap. Don't expand pre-emptively.

**Translation keys:** the `errors` namespace already has the codes the
fix needs (`AUTH_UNAUTHORIZED`, `PROFILE_ONBOARDING_REQUIRED`,
`FORBIDDEN`, etc., per `apps/web/messages/{ar-PS,ar,en}.json`). Do not
add new keys.

**i18n key reuse:** for the `/login?return=...` redirect on 401, no UI
copy needed — the redirect happens before render.

### Item B — pain inventory second-pass critique

Re-read `design-handoff-2026-05/08-pain.md` "Lead additions" section
(the 10 AI-written findings from round 2). For each finding, look at
the referenced snapshot in `04-screens/{screen}/web/*.png` again with
fresh eyes and write a one-paragraph judgment under the new
`## AI-assisted second-pass critique (round 3)` section in the same
file:

- Format per entry:

  ```
  - snapshot: 04-screens/feed/web/desktop-ar-PS-default.png
    finding: dev-status badge
    judgment: stands | weakened | retracted
    reason: one sentence, concrete.
  ```

- "Stands" must be the default only when the finding is unambiguously
  accurate after re-inspection.
- "Weakened" when the finding overstates severity, conflates two issues,
  or is partially wrong.
- "Retracted" when the finding doesn't match what the snapshot shows.

Be honest. Codex's own round-2 work is the target of the critique.

### Item C — native mobile captures

Out of scope this round. The packet must include a `questions[]` entry
spelling out exactly what the user would need to install/configure for
a future round to attempt native captures:

- Android Studio + an AVD (Android Virtual Device).
- Expo dev build for `apps/mobile` (`eas build --profile development`
  or the equivalent local dev-client build).
- Optional: macOS host with Xcode + iOS simulator (impossible on this
  Windows worktree).

Do not try to set any of this up.

## Out of scope (do not touch)

- `BRAND.md`, `02-system/tokens.*`, `RTL.md`, `MOBILE.md`, `NAV.md`,
  `PARITY.md`, `03-components/*`.
- `04-screens/*/web/*.png` (don't regenerate unless re-running
  `capture-snapshots.mjs` to verify success criterion 3).
- `04-screens/*/mobile/*.png` (Expo Web proxies, shipped in round 2).
- `09-moodboard/*` (shipped in round 2).
- The auth fixture mechanism (`apps/web/tests/.auth/storageState.json`
  is regenerated via the a11y spec; don't reshape it).

## Approval criteria

- All six success criteria met OR every miss surfaced as a
  `risks[]`/`questions[]` entry with verbatim error logs.
- Item A's fix is consistent with the round-1 pattern in
  `jobs/page.tsx`. No new helpers if `toErrorMessage` covers it.
- Item B's critique is concrete per-finding, not boilerplate, and at
  least one finding should land outside "stands" if the round-2
  inventory is anywhere short of perfect.
- `pnpm format:check` clean.
- No commits.

## Commit authority

User has **not** pre-authorized. Codex stops at green QA + emits
packet. Claude reviews → user authorizes commit explicitly.

## Risks

- Item A audit may find a wider 401 gap than just feed; if so, surface
  in `questions[]` rather than silently fixing every authed page.
- Item B critique may surface that Codex's own round-2 work was too
  conservative (or too aggressive). That's a feature, not a bug —
  honesty over self-preservation.

## Environment

- Repo: `C:\LinkedIn\.claude\worktrees\adoring-pare-2bf794`.
- PG: `127.0.0.1:5433`, trust auth, db `baydar`.
- Env: `.env.local` at repo root.
- API dev: `pnpm --filter @baydar/api dev` (`:4000`).
- Web dev: `pnpm --filter @baydar/web dev` (`:3000`).
- Auth fixture: `apps/web/tests/.auth/storageState.json`. Regenerated
  fresh in round 2 — TTL is 15 min, so if Codex's run takes longer it
  will need a regen via `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts`.

## Round budget

Max 3 review rounds in this skill instance; this is round 3.
If Codex's first attempt at Item A doesn't pass the probe with an
invalidated session, Claude will issue ONE `CHANGES_REQUESTED` with
the concrete missing case before escalating.
