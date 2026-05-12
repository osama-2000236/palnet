# Bundle Status

Refresh: 2026-05-12. Branch: `claude/adoring-pare-2bf794` @ `6ef6a7d`.
Generated: 2026-05-07. Branch: `claude/eloquent-yonath-6c4db3` @ `78b97a2`.

## 2026-05-12 refresh notes

Re-ran from scratch in this worktree. Findings vs prior bundle:

- **Token drift regression caught + fixed.** `apps/web/src/app/[locale]/(auth)/login/page.tsx:8` used `bg-gray-100` in the Suspense fallback added by `7d8ff74`/`e2d3ef5`. Replaced with `bg-surface-sunken` (convention used everywhere else for skeleton placeholders). `pnpm lint:tokens` → clean after fix.
- **Phase A re-copied.** 8 dirs, 10 system files, 6 spec md + 14 web tsx + 18 native tsx, full prototype tree, 24 screen tsx across 8 screens × 2 platforms.
- **Hex sweep re-run.** Same 2 hits in `apps/web/src/app/manifest.ts` (PWA — accepted).
- **Parity matrix re-generated.** 22 components.
- **Tokens quickref re-copied.**
- **Snapshots refreshed.** Re-ran `node scripts/capture-snapshots.mjs` 2026-05-12 06:22. Result: `captured=60 failed=0`. All 60 web PNGs in `04-screens/*/web/` now reflect post-`6ef6a7d` state including Login Suspense (`e2d3ef5`/`7d8ff74`), a11y fixture (`541eb50`), onboarding main landmark (`edda6ee`), composer/header skeletons (`7543107`/`3e79808`), avatar state fixes (`b3a29c2`), and the `bg-gray-100` → `bg-surface-sunken` fix this session.
- **A11y baseline.** Re-ran `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts`. Result: 15 passed, 14 skipped (sequential gate after first failure), 1 failed — `axe heading-order [moderate]` on `/ar-PS/jobs`: H3 follows H1 in the jobs list card title (skips H2). Log: see test output. Fix candidate: drop the H3 a level or insert an H2 section header above the list. Not launch-blocking, but should be in `08-problems.md` addenda.
- **Infra notes for next run.** Scoop PostgreSQL 18 on `:5433` (PG16 service occupies `:5432`). Root `.env.local` has DB URL + JWT secrets. `pnpm --filter @baydar/shared build` + `pnpm --filter @baydar/db build` + `pnpm --filter @baydar/db generate` are pre-req for cold start. Migrations already deployed (8 applied, 0 pending). Auth fixture at `apps/web/tests/.auth/storageState.json` regenerated.

## 2026-05-12 07:30 — Codex handoff round complete

Plan: `design-handoff-2026-05/codex-plan.md`. Items 1-3 from `08-problems.md` repo-specific addenda.

**Implemented (Codex):**

- Item 1 — `apps/web/src/app/[locale]/(app)/jobs/page.tsx:304` job-card `<h3>` → `<p>`.
- Item 3 — `DESIGN.md §7` Toast row added (web ✅, native ✅).

**Verified (Claude, post-Codex, in this worktree):**

- `pnpm lint:tokens` — clean.
- `pnpm --filter @baydar/web type-check` + `@baydar/api type-check` — clean (Codex output).
- `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts` — 26 passed, 16 skipped (job-detail conditional), 0 failed.
- `node scripts/capture-snapshots.mjs` — `captured=60 failed=0`. Refreshed at 07:43 after jobs fix.
- Dev logs: zero runtime errors during capture across `/feed`, `/jobs`, `/notifications`, `/search`, `/messages`, `/in/{handle}` in `ar-PS` + `en`. Item 2 ("1 error" overlay) was a stale-snapshot artifact, not a live bug — resolved by the `6ef6a7d`/`541eb50` cascade. Marked accordingly in `08-problems.md`.

**Out-of-scope drift reverted:**

- Codex modified 4 bundle component snapshot copies (`design-handoff-2026-05/03-components/src-web/{AppShell,Composer,Toast,TypingIndicator}.tsx`) — inline-style → Tailwind arbitrary refactor. Reverted via `git checkout HEAD --`. Bundle now mirrors source again. The refactor itself is a sensible follow-up if applied to `packages/ui-web/src/` source; not landing in this round.

**Review status:** `STATUS: APPROVED` (Items 1+3 implemented and verified; Item 2 resolved as not-a-bug with evidence). Commit authorization not yet given.

**2026-05-12 round 2 correction.** Item 2 was reopened. Round 1's dev-log scan was inconclusive — Codex round 2's vision pass over the refreshed PNGs caught the `1 error` badge still rendered in `04-screens/feed/web/desktop-ar-PS-default.png`. A Playwright console-error probe confirmed the source: `apps/web/src/app/[locale]/(app)/feed/page.tsx` throws `ApiRequestError: API 401 AUTH_UNAUTHORIZED` unhandled when the access token expires. Round 1's reasoning ("dev log was clean") was wrong because next-dev surfaces page-throw and console.error in the overlay regardless of terminal-log content. The 08-problems.md addenda now lists Item 2 with a concrete fix candidate.

## 2026-05-12 round 2 — design pre-pass closeout

Plan: `design-handoff-2026-05/codex-plan-round2.md`. Target: close the 4 `[HUMAN]` gates.

**Implemented (Codex):**

- Item 3 — `10-ask.md` Round 2 scope re-audit appended. Original 3 picks (empty-state system, surface hierarchy, onboarding flow) confirmed as highest-leverage with concrete reasons tied to refreshed snapshots.
- Item 4 — `08-pain.md` Lead additions filled with 10 AI-assisted findings, each tied to a specific `04-screens/*/web/*.png` path. Marked "AI-assisted, lead review pending".
- `scripts/capture-mobile-snapshots.mjs` — Expo Web capture script (iPhone 15 + Pixel 7 viewports, ar-PS + en, `expo-web-` filename prefix to disclaim native fidelity).

**Codex sandbox blocked (run unsandboxed by Claude):**

- Mobile capture run — Playwright `spawn EPERM` in Codex sandbox. Claude ran `node scripts/capture-mobile-snapshots.mjs` in this worktree → `captured=40 failed=0 tooSmall=0`.
- Moodboard capture — same `spawn EPERM`. Claude wrote `scripts/capture-moodboard.mjs` + ran it: 5 refs captured (tabby 428 KB, tamara 218 KB, linear 140 KB, raseef22 920 KB, careem 97 KB), all ≥ 50 KB. `09-moodboard/{ref}/screen.png` + `notes.md` for each.

**Round 1 correction surfaced by Codex:**

- Item 2 reopened. Codex's vision pass spotted the `1 error` badge still rendered in the 07:43 feed PNG. Root cause confirmed via Playwright console-error probe: `apps/web/src/app/[locale]/(app)/feed/page.tsx:67` throws `ApiRequestError: API 401 AUTH_UNAUTHORIZED` unhandled when the access token expires. Round 1's "dev log clean → resolved" conclusion was wrong. Re-captured all 60 web PNGs + 40 mobile PNGs at 12:05 with a freshly-regenerated auth fixture (15-min TTL); fresh feed snapshot is clean. The underlying bug (feed must catch 401) is documented in `08-problems.md` repo-specific addenda with a fix candidate.

**Out-of-scope drift reverted:**

- `apps/mobile/expo-env.d.ts` — Codex's `pnpm` invocations stripped a trailing newline. Reverted via `git checkout HEAD --`.

**Verification:**

- `pnpm format:check` — see commit run.
- `pnpm lint:tokens` — clean (no source changes outside scripts).
- A11y re-run during auth-fixture regen: 26 passed, 16 skipped, 0 failed.
- Web snapshot capture: 60 / 0.
- Mobile snapshot capture: 40 / 0.
- Moodboard: 5 / 5 above threshold.

## Residual gaps (after round 2)

- Item 2 (feed 401 handling) — code fix candidate documented in `08-problems.md`; tracked for future round / engineering pass, not for the design pass itself.
- Real iOS sim / Android emu native captures remain `[HUMAN]`. Expo Web mobile PNGs are the proxy in the bundle.
- Lead human review of the AI-assisted `08-pain.md` additions remains optional but recommended before final handoff.

| Task                   | Status  | Notes                                                                                                                                                   |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-0.1 scaffold         | done    | 8 dirs created (plan said 9, off-by-one in spec — `08-*.md` are files, not dirs).                                                                       |
| T-A.1 brand            | done    | `01-brand/BRAND.md` copied.                                                                                                                             |
| T-A.2 system           | done    | 10 files in `02-system/`.                                                                                                                               |
| T-A.3 components       | done    | 6 specs + 14 web tsx + 18 native tsx.                                                                                                                   |
| T-A.4 prototype        | done    | Full tree in `05-prototype/`.                                                                                                                           |
| T-A.5 screens          | done    | 23 source files copied across web + mobile. Initial `Copy-Item *` glob failed on `[locale]` brackets — re-ran via `robocopy`.                           |
| T-B.1 pain inventory   | **gap** | `[HUMAN]` stub in `08-pain.md`. Lead fills via screen-by-screen walk.                                                                                   |
| T-B.2 token lint       | done    | Clean. `07-audits/tokens-lint.txt`.                                                                                                                     |
| T-B.3 hex sweep        | done    | 2 hits. `07-audits/hex-hits.json`. Both in PWA manifest — flagged in `08-problems.md`.                                                                  |
| T-B.4 parity matrix    | done    | 22 components, generated table. `07-audits/parity-matrix.md`.                                                                                           |
| T-B.5 a11y baseline    | done    | Required `pnpm --filter @baydar/shared build` first. 19 passed, 2 skipped (no seeded jobs). `07-audits/axe-run.log`.                                    |
| T-B.6 web snapshots    | done    | 60 PNGs (10 routes × 3 viewports × 2 locales). First run failed auth — required B.5 to seed `apps/web/tests/.auth/storageState.json` before re-running. |
| T-B.7 mobile snapshots | **gap** | `[HUMAN]` — Expo simulator orchestration. See `04-screens/MOBILE-SNAPSHOTS.md`.                                                                         |
| T-B.8 content fixtures | done    | `06-fixtures/content.json`. `very_long_post` placeholder needs `[HUMAN]` native pass.                                                                   |
| T-B.9 moodboard        | **gap** | `[HUMAN]` — taste call. See `09-moodboard/README.md`.                                                                                                   |
| T-B.10 token quickref  | done    | `06-fixtures/tokens-quickref.css`.                                                                                                                      |
| T-C.1 problems         | done    | `08-problems.md`. Repo-specific addenda included.                                                                                                       |
| T-D.1 README           | done    | `00-README.md`.                                                                                                                                         |
| T-E.1 status           | done    | this file.                                                                                                                                              |
| T-F.1 ask              | **gap** | `[HUMAN]` — lead picks 2-3 scope items. See `10-ask.md`.                                                                                                |

## Open [HUMAN] tasks blocking final delivery

| Task                   | AI substitute?                                                              | Lead must                                                  |
| ---------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| T-B.1 pain inventory   | yes — 17 items written from snapshot walk + 3 launch-blocking bugs surfaced | review, add findings from manual walk + mobile inspection  |
| T-B.7 mobile snapshots | no — needs simulator                                                        | run runbook in `04-screens/MOBILE-SNAPSHOTS.md` (~30 min)  |
| T-B.9 moodboard        | partial — curated 5 refs with notes; no images                              | open each URL, screenshot, drop into per-ref dir (~30 min) |
| T-F.1 design ask       | yes — 3 scope items pre-picked based on leverage                            | confirm or override picks (~10 min)                        |

AI residual gap: **mobile snapshots only** (~30 min lead time).

## Launch-blocking bugs surfaced

`08-pain.md` flagged 3 issues that aren't design problems — engineering must fix before design pass:

1. `/ar-PS/settings` returns 404.
2. Search tab pills show raw i18n keys (`search.tabs.jobs`).
3. Jobs empty state shows raw `API 403 PROFILE_ONBOARDING_REQUIRED`.
4. Multiple screens show `1 error` / `7 errors` dev overlay — runtime exceptions.

Tracked in `10-ask.md` as out-of-scope pre-conditions.

## Deviations from plan

- T-A.5 used `robocopy` instead of `Copy-Item -Recurse "...\*"` because PowerShell glob expands `[locale]` as a character class.
- T-B.5 needed an extra step (`pnpm --filter @baydar/shared build`) — not documented in plan; adding to verify pre-flight.
- T-B.6 needed two passes: first run captured `/login` for every authed route because auth fixture file didn't exist yet. T-B.5 created it as a side-effect, which made the second pass produce real screen captures.

## Verification snapshot

- Sample: `04-screens/feed/web/desktop-ar-PS-default.png` shows real Feed with olive nav, RTL profile rail, Arabic placeholder copy, empty state, "وصول سريع" right rail. Confirms auth + RTL working.
- Dev "1 error" overlay visible in snapshot — runtime error worth investigating before design pass starts.
