# Bundle Status

> **Sprint 27 refresh (2026-07-02):** `08-pain.md` (v3), `08-problems.md`, and `10-ask.md` (Pass 2) re-verified against `main`. Remaining `[HUMAN]` gaps unchanged: mobile simulator snapshots (T-B.7), moodboard captures (T-B.9). New gap: `04-screens/` web snapshots predate premium/saved/company surfaces. Ask gate: lead must approve Pass 2 before any design output is implemented.

Generated: 2026-05-07. Branch: `claude/eloquent-yonath-6c4db3` @ `78b97a2`.

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
