# Codex Handoff Plan — Design Bundle Pre-Pass Cleanup

## Context

Design handoff bundle at `design-handoff-2026-05/` is `READY` with 60 fresh web snapshots.
Three code-fix items surfaced during bundle prep are tractable for Codex and would
strengthen the bundle before it ships to Claude Design.

Out of scope items (mobile screenshots, moodboard images, ask-scope confirmation,
lead pain-walk additions) remain human-gated and are **not** handed off here.

## Goal

Close the three code-level findings logged in `design-handoff-2026-05/08-problems.md`
"Repo-specific addenda" so the bundle reflects a clean baseline.

## Success criteria

1. `/ar-PS/jobs` passes axe `heading-order` rule.
2. `/feed` and other authed routes show **zero** Next.js dev error-overlay badges in fresh snapshots.
3. `Toast` primitive listed in `DESIGN.md §7` (web + native rows).
4. `pnpm lint:tokens`, `pnpm --filter @baydar/web type-check`, `pnpm --filter @baydar/api type-check` all clean.
5. Re-run `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts` — 0 failures.

## In scope

### Item 1 — a11y heading-order on `/ar-PS/jobs`

**Symptom:** `axe heading-order [moderate]` violation. Selector path ends at
`h3` inside `li > a > .rounded-lg.shadow-card`. H1 (page title) → H3 (card title)
skips H2.

**Files:**

- `apps/web/src/app/[locale]/(app)/jobs/page.tsx`

**Fix candidates (pick the smaller diff):**

- Drop the card `h3` to a non-heading element (a styled `<p>` or `<span>`) since
  the card already lives inside a labeled list.
- Or insert a visually-hidden `h2` ("نتائج الوظائف" / "Job results") above the list.

**QA:** `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts`
must reach 0 failures across `chromium-ar` + `chromium-en`.

### Item 2 — Dev "1 error" overlay on authed routes

**Symptom:** `08-problems.md` repo-specific addenda flags "Authenticated dev
mode shows '1 error' overlay in feed snapshot — runtime error in dev that
doesn't surface on home page". Visible in older feed snapshot; need to re-verify
on current snapshots and capture the actual console error.

**Process:**

1. Start API + web dev servers (env in repo-root `.env.local`, DB on `:5433`).
2. Load `/ar-PS/feed` authed (use `apps/web/tests/.auth/storageState.json`).
3. Capture browser console + Next.js terminal output. Identify the error
   (most likely: a hook order, hydration mismatch, or a missing-key from a
   silently-failing i18n lookup).
4. Fix root cause. Do not suppress the overlay.
5. Re-run `node scripts/capture-snapshots.mjs`. Open any captured PNG. Bottom-left
   dev overlay must show no badge.

**Files:** unknown until reproduced. Likely under
`apps/web/src/app/[locale]/(app)/feed/page.tsx`,
`apps/web/src/components/AppShell.tsx`, or i18n message files.

**QA:**

- Re-run snapshots — all 60 PNGs must show no dev error badge.
- `pnpm --filter @baydar/web type-check` clean.

### Item 3 — Toast primitive missing from `DESIGN.md §7`

**Symptom:** `Toast` shipped Sprint 21 in `packages/ui-web/src/Toast.tsx` and
`packages/ui-native/src/Toast.tsx`. `DESIGN.md §7` component inventory has not
been updated.

**Files:**

- `DESIGN.md`

**Fix:** Add a `Toast` row to the component inventory table in §7 with the same
column shape as other primitives (web ✓, native ✓, status, RTL note if any).
Keep the description aligned with existing rows in tone and length.

**QA:** None automated. Verify by re-reading §7 — Toast row present, table
formatting intact.

## Out of scope (do not touch)

- Mobile screenshot capture (`04-screens/{screen}/mobile/`) — needs iOS sim +
  Android emu, human-only.
- Moodboard image curation (`09-moodboard/`) — taste call, human-only.
- `10-ask.md` scope picks — user judgment, human-only.
- `08-pain.md` "Lead additions" — subjective walk, human-only.
- Any change to `02-system/tokens.*`, `BRAND.md`, `RTL.md`, `MOBILE.md`,
  `NAV.md`, `PARITY.md` — locked for the design pass.
- Snapshot script (`scripts/capture-snapshots.mjs`) — works, don't refactor.

## Approval criteria

- All five success criteria pass.
- Changed files limited to: `apps/web/src/app/[locale]/(app)/jobs/page.tsx`
  (Item 1), `DESIGN.md` (Item 3), plus whatever single file Item 2's root cause
  lives in.
- Review packet includes the actual error message Item 2 surfaced (proof of
  root-cause-fix, not suppression).
- No new tokens, no new dependencies, no test weakening.

## Commit authority

User has **not** pre-authorized commits. Codex must stop at green QA and surface
the packet for review. Claude reviews → user authorizes commit explicitly.

## Risks

- Item 2 may uncover a real bug in shipped code, not just a dev-only warning.
  If the fix touches more than one file or changes user-visible behavior,
  Codex must surface as `questions[]` in the packet rather than expanding scope.
- Item 1's smaller diff may depend on whether the jobs list is the only place
  the card pattern is reused. If `h3` cards exist elsewhere (network? search?
  notifications?), the fix may cascade. Audit before editing.

## Environment

- Workspace: `C:\LinkedIn\.claude\worktrees\adoring-pare-2bf794` (git worktree
  on branch `claude/adoring-pare-2bf794`).
- Postgres: scoop PG 18 on `127.0.0.1:5433`, trust auth, db `baydar`, user `postgres`.
- Env file: repo-root `.env.local`.
- Auth fixture: `apps/web/tests/.auth/storageState.json`.

## Round budget

- Max 3 review rounds before escalating to user.
