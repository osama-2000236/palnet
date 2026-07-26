# Baydar — finish the Opus 5 review: the judgement pass and the shortcuts

You are continuing a full-repo review of **Baydar** (بيدر), the Arabic-first
professional network in `osama-2000236/palnet`. A previous session did the
mechanical half and merged it as PR #93 (`a4fcaa5` on `main`). Your job is the
half that machines could not do, plus every shortcut that session took.

Read `docs/audit/OPUS5-VERDICT-2026-07-25.md`,
`docs/audit/OPUS5-REVIEW-2026-07-25.md`, and `docs/HANDOFF.md` first. They are
accurate — the previous session corrected them whenever it was wrong, including
about itself. Trust them over anything in this prompt if the two disagree.

Work on one branch `review/opus5-round-2` cut from `main`. One logical change
per commit, conventional-commit subjects, English. Do not force-push.

---

## Do not redo these

Already landed and verified. Re-doing them wastes the session:

- Repo hygiene: worktrees, branches, stashes purged; `.git` 58M → 11M.
- Both screenshot harnesses exist and work — `apps/web/e2e/shots.mjs` (46
  routes × 2 locales × 2 themes × 2 viewports) and `apps/mobile/e2e/shots.mjs`
  (38 screens × 2 locales × 2 themes, `adb` deep links + raw framebuffer).
- 5 P1s, 8 P2s fixed: CSP-nonce hydration mismatch, Arabic plural timestamps on
  Hermes, two missing message-key classes, a 390px overflow, an orphan legal
  route, a dead 211-line component, and more.
- Static sweeps clean: dead handlers (zero), hardcoded English (zero), physical
  CSS direction properties (zero), viewer-scoped public caching (clean),
  horizontal overflow at 390px (zero across all routes).
- Both parity suites assert every statically resolvable `t("key")` exists.
- Maestro 7/7. Lighthouse desktop + mobile wired and passing.
- Security headers assertion wired into CI. CORS verified fail-closed.
- 20 migrations verified applying forward into an empty schema.

---

## The work

### 1. The rubric — the actual reason this session exists

`docs/design/screen-critique-2026-07.md` defines five dimensions: philosophy,
hierarchy, detail, functionality, restraint. Score every screen 1–10. Ship gate
is ≥7; anything below is a defect with a required fix, not an opinion.

47 web routes and 38 mobile screens. Capture both matrices, then **look at every
image** — 520 of them. The previous session viewed about 20 and said so; do not
repeat that and call it done. Crop and zoom into anything uncertain rather than
judging from a full-page thumbnail; that is how 4px misalignments and clipped
Arabic descenders get caught.

Compare each mobile screen against its web twin as you go. `docs/design/PARITY.md`
records the intentional gaps — treat anything not listed there as drift.

Record scores per screen in `docs/audit/OPUS5-RUBRIC-<date>.md` with the
screenshot filename as the evidence pointer. Fix every sub-7.

### 2. States nobody has ever seen

`shots.mjs` captures whatever state the app happens to be in — which is the
happy path with seeded data. Charter §3c wanted these captured deliberately, by
intercepting the API. Not done at all:

- **Empty** — every list surface with zero rows.
- **Error** — every surface with the API returning 500.
- **Offline** — the offline banner and every surface behind it.
- **Loading** — skeletons, deliberately held.

Playwright's `page.route()` does this on web. On mobile, point the app at a stub
or kill the `adb reverse` tunnel for the offline case.

Then long-content stress, also never done: a 60-character Arabic name, a
300-word post, a job title with no spaces, a company with no logo.

### 3. Interaction correctness

Static analysis proved no handler is *undefined*. It proved nothing about what
handlers do. None of this has been exercised:

- **Every form**: submit, validation, field-local error display, success
  feedback, double-submit guarding, disabled-while-pending.
- **Optimistic updates**: do they roll back when the request fails? Are counts
  consistent after a refetch?
- **SSE**: reconnect after network loss, resume, no duplicate events. There is
  currently **zero** test coverage for this anywhere in the repo — verified.
- **Auth/session**: token refresh, expiry mid-session, logout, protected-route
  redirects, on both platforms.
- **Keyboard**: walk the entire web app by keyboard. `test:a11y` passing is the
  floor, not the ceiling.

### 4. The 11 long service files

`pnpm qa:design` allowlists 11 files over 300 LOC. Charter §3h asked for each to
be read looking for real defects — long service files are where correctness bugs
hide. **Not done.** Read them:

`billing.service.ts` (792), `messaging.service.ts` (700),
`companies.service.ts` (637), `search.service.ts` (442), `seed.ts` (438),
`profiles.service.ts` (415), `karama.service.ts` (384),
`auth-tokens.service.ts` (378), `connections.service.ts` (378),
`qa-load-fixture.ts` (362), `notifications.service.ts` (303).

Refactor only where a fix requires it. Do not do a cosmetic split that churns
800 lines and buys nothing.

### 5. Shortcuts the previous session took

Each is a deliberate simplification that session flagged. Close or justify:

| Where | Shortcut |
| --- | --- |
| `apps/mobile/e2e/shots.mjs` | `PAINTED_MIN = 8` and the 6%/96% crop fractions are empirical, tuned on one AVD. Verify on a second device profile or derive them. |
| `apps/mobile/e2e/shots.mjs` | **No console capture at all.** The web harness writes `_console__*.json` per cell and that is how the missing message keys were found. Mobile has no equivalent — wire `adb logcat` per cell. |
| both parity tests | Cannot see dynamic keys — `t(variable)`. That is exactly the shape of the bug they were written for. The harness console sweep is the only net; on mobile that net does not exist yet (see above). |
| `apps/web/e2e/visual.spec.ts` | **2 committed snapshots against a 46-route matrix.** The charter called this ratio out as part of why the review was needed. Widen it. |
| `apps/web/playwright.config.ts` | `workers: 1` costs ~3.5min. The real fix is a schema per worker. |
| `apps/mobile/app/` | 52 colocated components live under the routes directory, each carrying a fake `export default () => null` so Expo Router does not claim it. Move them to `src/`. ~52 files, mechanical, deletes a whole class of confusion. |
| `_overflow.json` | Only written when shooting the matrix. Not a CI gate. |

### 6. Verify the claims, do not inherit them

Two Phase 5 items were marked covered by reading spec filenames, not assertions.
Confirm or correct:

- Media presign MIME/size limits — `media.service.spec.ts` looks right, verify.
- Account deletion, 30-day restore, and export "do what the docs claim" — the
  specs exist; nobody checked them against `docs/`.

### 7. Housekeeping

- `git tag -l 'backup/*'` — 8 tags from the Phase 0 purge. The review has
  landed; delete them.
- QA fixture leakage: 10 companies in the local DB, 8 are prior-run debris
  (`shots-billing-*`, `qadis-tech-*` ×3, `nimbus-co-*`). `qa:cleanup` exists and
  is not being run. Consider wiring it into the harness teardown.
- Landing page mixes colloquial Levantine ("مين يلاقيك", "مش مطاردة الانتشار")
  with MSA elsewhere. Needs the native-speaker review, not your judgement —
  collect the instances into one list for that reviewer.

---

## Traps this repo has already paid for

Read these before debugging anything. Each cost real time.

**Harness lies are silent.** A login screen, a spinner, and a blank screen are
all "valid" renders. The previous session found four separate harness defects
this way: expired tokens made 15 of 368 shots the sign-in page; a fixed settle
caught a form mid-spinner; a blank screen passed a stability check because blank
is stable; and overflow was measured after a `fullPage` screenshot, which
resizes the viewport. **Hash your output and look for duplicate images** — that
is what caught the first one. Assume the next harness bug is also silent.

**Shell escaping mangles regex in `node -e`.** Three separate wrong conclusions
came from this — a dead-handler script that reported 11 false positives, and two
scripts that died on unterminated groups. Write the script to a file and run it.

**`pnpm --filter X cmd -- --flag` forwards `--` as a literal argument.** It broke
`qa:load-fixture` (run-id regex) and Playwright ("No tests found"). Use
`pnpm exec <tool>` instead.

**`BAYDAR_SKIP_SAFETY_E2E_ON_EPERM=1` sets `webServer: []`.** Applying it
preemptively disables the servers and every test gets `ERR_CONNECTION_REFUSED`.
It is for when EPERM actually bites.

**Git Bash rewrites `/foo` arguments into Windows paths.** `node script.mjs /feed`
became `C:/Program Files/Git/feed` and silently tested a 404. It also mangles
`git show rev:path`. Use `git ls-tree` and strip leading slashes.

**Metro needs `--clear` when it wedges**, and a poisoned cache presents as the
app hanging at "Bundling 100%". The emulator sometimes needs a cold boot
(`-no-snapshot-load`) — `adb emu kill` then reboot fixed an app that would not
render for 20 minutes.

**Web and production build fight over `.next`.** Running `next dev` and
`turbo build` together gives `Cannot find module './8899.js'`. Stop the dev
server and clear `.next`.

**Maestro cannot type Arabic** (`Unicode character input is not supported`,
mobile-dev-inc/maestro#146) and matches Arabic text **exactly, not as a
substring**. Both were verified by probe.

**`packages/ui-web` edits need a dev-server restart**; `apps/web/messages/*.json`
edits need `.next` deleted, or `t()` renders the key path and the console throws
`MISSING_MESSAGE` while the JSON on disk is correct.

**tailwind-merge eats `text-*` utilities** — it reads any `text-…` class as a
colour and drops it when a real colour follows in the same `cx()`. That is why
the bidi helper is named `bidi-plaintext`. Confirm such fixes by reading
computed style, never from a screenshot.

**`dir="auto"` fixes word order but changes alignment.** Ordering and alignment
are two separate fixes.

---

## Environment

Windows / PowerShell, repo root `C:\LinkedIn`, pnpm 9.12.0, Node 20 (`.nvmrc`).
`rm -rf` does not exist — `Remove-Item -Recurse -Force`, and
`-LiteralPath "\\?\<path>"` to beat MAX_PATH.

Local stack:

```bash
node scripts/run-api-local.mjs .env.qa.local     # API on 4000
pnpm --filter @baydar/web dev                    # web on 3000
pnpm --filter @baydar/mobile start --clear       # Metro
```

`.env.local` has 28/29-character JWT secrets, below the ≥32 minimum — use
`.env.qa.local`. `BANK_TRANSFER_IBAN` is empty there, so `billing.spec.ts` fails
until you set one; that is a `BLOCKED` credential, not a defect.

Emulator: `Pixel_7_Pro`, `-gpu swiftshader_indirect`. The dev client
`ps.baydar.app` is already installed. Set `adb reverse tcp:8081` and `tcp:4000`.

---

## Definition of done

- Every screen scored on all five dimensions, or the exception justified in
  writing. Zero sub-7 scores left unfixed.
- Both matrices captured post-fix and **every image viewed**.
- Empty, error, offline, loading, and long-content states captured deliberately
  for every surface.
- Every form, optimistic update, SSE reconnect, and auth transition exercised.
- All 11 long service files read; defects found are fixed or recorded.
- Every shortcut in §5 closed or justified in writing.
- Backup tags deleted, fixture leakage cleaned.
- Every CI gate green from a clean install, in one run, with pasted exit codes.
- `docs/audit/OPUS5-RUBRIC-<date>.md` committed; the verdict updated to say the
  matrices are design-reviewed rather than merely machine-verified.

Do not ask questions. Make the judgement calls, record each in one line, and
continue. When you are wrong, say so plainly and correct it — the previous
session was wrong four times and the record of that is more useful than a
document that pretends otherwise.
