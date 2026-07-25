# Baydar — full-repo vision review, cleanup, and remediation run

You are the engineering lead on **Baydar** (بيدر), the Arabic-first professional network in this
repository (`osama-2000236/palnet`, branch of record `main`). The product is code-complete on paper
and has been built across ~91 merged PRs by a rotating cast of agents. It has never been reviewed as
one whole. Your job is to take it from "shipped features" to "a product real users can be handed",
in one autonomous run.

This is a **single task specification, complete up front.** Read it once, then run it end to end.

---

## 1. Operating contract

**Autonomy.** Do not ask me questions. Make every judgment call yourself. When two readings of a
requirement would lead to different work, pick the one supported by the hierarchy in §3, record the
call in the ledger with one line of reasoning, and continue. Never stop to confirm.

**Completeness.** Deliver the whole task at the scope defined here. No stubs, no placeholders, no
`// TODO: later`, no "recommend as follow-up" for work you can do. The only legitimate unfinished
item is one that requires an input you cannot produce — a credential, a paid asset, a human Arabic
copy review, a physical device. Those go in a `BLOCKED` section naming the exact input needed and
who provides it. Everything else you finish.

**Evidence over assertion.** Every finding you report and every fix you claim must rest on one of:
a screenshot you captured and looked at, a command's exit code and output, a file you read, a
computed style or DOM value you queried, or a `gh` API response. Never write "should be fine",
"likely works", "presumably". If you did not observe it, say you did not observe it. When a
screenshot and the code disagree, read the computed style before concluding — the repo has already
burned two cycles on exactly that (§9).

**Report everything, filter later.** During audit passes, record every finding at every severity,
including nits and things you suspect but cannot confirm. Do not pre-filter to "high severity only" —
that suppresses real defects. Triage into severity buckets happens as a separate, later step inside
the ledger, after collection is closed.

**Do not narrow, widen, or transform the task.** If you think a step here is mistaken or a better
approach exists, say so in one sentence in the ledger and then do the step as specified.

**Scope boundary.** You are fixing what exists. You are not adding new product features, new routes,
new monetization surfaces, or new dependencies. If a fix seems to require a new dependency, solve it
with what the monorepo already has (Next.js 15 App Router, Prisma, Tailwind, `@baydar/ui-*`, React
Native + Expo, Zod, TanStack Query, self-managed JWT). One exception: you may add a dev-only script
under `scripts/` or `apps/*/e2e/` when the alternative is unverifiable work.

**Narration.** One sentence before the first tool call of each phase. During a phase, speak only
when you find something that changes the plan or you change direction. At each phase gate, lead with
the outcome — what you found, what you fixed, what is red — then supporting detail.

**Delegation.** Use subagents only for genuinely independent, wide investigations — for example
"audit all 45 web routes for hardcoded strings" or "read every API module for viewer-scoped cache
headers". Never spawn a subagent for work you can finish in a handful of tool calls, and never spawn
one to re-check your own output. Prefer one subagent over three. Keep total spawns under ten for the
whole run.

**Written-output length.** Ledger and report entries are one to three lines each: what, where,
evidence, fix. No executive summaries, no restating the same finding in three registers, no filler
sections. Density over volume.

**Commits.** One logical change per commit, conventional-commit subject, imperative mood, in
English. Never bundle unrelated fixes. Work on a single branch `review/opus5-launch-readiness` cut
from `main`. Do not force-push, do not rewrite `main`, do not `git push --force` anything.

---

## 2. Recommended invocation

Run at `xhigh` effort (`claude --effort xhigh`, or `/effort xhigh`). That is the level built for
agentic runs over 30 minutes with token budgets in the millions, which is what this is. Do not use
`max`: it is session-only, prone to overthinking on structured multi-step work, and this document
already supplies the structure `max` would try to invent. Do not use `ultracode` either — it is
`xhigh` plus standing permission to spin up multiagent workflows, which fights the delegation cap in
§1. For a single deep turn, such as the Phase 3 triage or the Phase 5 verdict, put the word
`ultrathink` in that one message instead of raising session effort.

Thinking stays on; it cannot be disabled at `xhigh` on Opus 5.

**Session boundaries.** Do not compact or clear mid-phase — losing the thread inside a phase is the
expensive failure. At each phase gate the ledger is already on disk, so `/clear` there is safe and is
the single biggest lever on token spend: every turn resends the whole conversation, and a phase that
carried 232 screenshots should not be riding along inside the fix phase. Start each new phase by
reading the ledger and the audit doc back in. Phases 0 and the mechanical stretches of Phase 4 do
not need Opus — drop to Sonnet 5 for those and come back to Opus 5 for judgment work. If you spawn a
subagent, give it `low` or `medium` effort in its frontmatter; a wide file sweep does not need
`xhigh`.

Environment is **Windows / PowerShell**, repo root `C:\LinkedIn`, pnpm 9.12.0, Node 20 (`.nvmrc`).
`rm -rf` does not exist — use `Remove-Item -Recurse -Force`. The Playwright safety spec has a
documented Windows EPERM guard: `$env:BAYDAR_SKIP_SAFETY_E2E_ON_EPERM = "1"` when it bites.

---

## 3. Authority hierarchy — resolve every ambiguity in this order

1. `DESIGN.md` — visual system, surfaces (§5.6), signature pattern (§6), component inventory (§7),
   layout (§10), screens (§11), the "what NOT to do" list (§13).
2. `BRAND.md` — name, voice, tone.
3. `docs/design/RTL.md` — non-negotiable. Logical properties only.
4. `docs/design/MOBILE.md` — mobile overrides to the web system.
5. `docs/design/PARITY.md` — the web/native primitive matrix and shared prop vocabulary.
6. `docs/_archive/prototype-2025/Baydar Prototype.html` — the working visual ground truth. Open it
   and look at it when a screen's intended composition is unclear.
7. `docs/design/screen-critique-2026-07.md` — the scoring rubric you will use (below).
8. `design-handoff-2026-06/README.md` — the parity contract table.

`CLAUDE.md` §"What to build next" points at `docs/HANDOFF.md`, which declares itself **SUPERSEDED
2026-07-02** in its own first line. Three overlapping status docs exist: `docs/HANDOFF.md`,
`docs/HANDOFF-FABLE5.md`, `docs/HANDOFF-FABLE5-2026-07.md`. Reconciling this is Phase 1 work, not a
question for me.

If a design decision would make Baydar look like LinkedIn, pick the other one.

---

## 4. Verified repository facts — do not re-derive, but do re-verify anything you rely on

Monorepo: pnpm workspaces + Turborepo. `apps/{web,mobile,api}`, `packages/{config,db,shared,ui-native,ui-tokens,ui-web}`.
931 tracked files.

- **Web**: Next.js 15 App Router, `apps/web/src/app/[locale]/`, 46 `page.tsx` route files across
  `(admin)`, `(app)`, `(auth)`, `(public)` groups plus `cv` and the locale root.
- **Mobile**: Expo Router, `apps/mobile/app/`, 38 route screens across `(app)` and `(auth)`, plus
  colocated `_`-prefixed component folders and two `_layout.tsx` shells.
- **API**: NestJS, `apps/api/src/modules/*`.
- **Vision harness already exists**: `apps/web/e2e/shots.mjs` — logs in as `demo@baydar.ps` /
  `Password123` against `http://localhost:4000/api/v1`, resolves real job/company/profile ids so
  detail routes render content instead of 404s, then shoots full-page PNGs across
  29 routes × {ar-PS, en} × {light, dark} × {1440×900, 390×844} = 232 images, waiting for
  `.animate-pulse` to clear (skeletons outlive `networkidle`; blank shots are the failure mode) and
  dumping per-matrix-cell console errors to `_console__*.json`.
- **Playwright**: `apps/web/playwright.config.ts`, `testDir: ./e2e`, projects `chromium-ar` /
  `chromium-en`, locale `ar-PS`, spins its own API (`scripts/run-api-local.mjs` + `.env.qa.local`)
  and web server. Specs: `a11y`, `billing`, `full-flow`, `growth`, `landing`, `moderation`,
  `safety`, `ux-sad-path`, `visual`.
- **Mobile E2E**: Maestro flows in `apps/mobile/.maestro/` (7 flows), opt-in, no screenshot capture.
- **There is no mobile vision harness.** The 2026-07-23 vision pass was web-only. This is a gap you
  will close in Phase 2.

### CI gates (`.github/workflows/ci.yml`) — these are your green bar

```
pnpm install --frozen-lockfile
pnpm --filter @baydar/db db:generate
pnpm lint
pnpm format:check
pnpm lint:tokens
pnpm qa:design
pnpm check:release-placeholders
pnpm type-check
pnpm --filter @baydar/db db:deploy && pnpm test && pnpm --filter @baydar/mobile test
pnpm turbo run build --filter @baydar/web
pnpm --filter @baydar/web exec playwright install --with-deps chromium
pnpm --filter @baydar/web e2e
npx --yes @lhci/cli@0.14.x autorun --config=./apps/web/lighthouserc.json
```

Also available and expected: `pnpm mobile:recovery-check` (wraps `check:mobile-imports`,
`check:native-versions`, mobile lint, mobile type-check), `pnpm lint:mobile-routes`,
`pnpm --filter @baydar/web test:a11y`, `pnpm --filter @baydar/db qa:load-fixture -- --run-id=<id> --users=2`.

**Baseline as of this writing**: `pnpm lint:tokens` clean, `pnpm qa:design` clean (11 legacy
over-300-LOC warnings), `pnpm check:release-placeholders` clean, zero merge-conflict markers in
tracked source, exactly one `TODO` in production source
(`apps/api/src/modules/billing/wallets/wallet-registry.ts:40`). Confirm each of these yourself before
you trust it — and treat any _new_ red as something you introduced.

---

## 5. Phase 0 — Repo hygiene and conflict purge

Nothing downstream is trustworthy until the working tree is. Do this first, commit it separately from
any behavioural change.

**Known debris, verified:**

- `git worktree list` reports **five registered worktrees marked `prunable`**: `C:/b` (detached at
  `3da7e8b`) and four under `C:/LinkedIn/.claude/worktrees/` (`blissful-austin-7e6f55`,
  `epic-wiles-84cc6b`, `exciting-einstein-05cf0b`, `zealous-bassi-ff4cee`).
- `.claude/worktrees/` holds **eleven** physical directories — the five above plus
  `adoring-aryabhata-a4b065`, `beautiful-swirles-8f7645`, `gracious-montalcini-8b2872`,
  `practical-lehmann-f6f567`, `priceless-driscoll-22ccaa`, `sad-euler-f8602d`,
  `unruffled-hofstadter-f13834` — several carrying their own full `node_modules`. Gitignored, so
  invisible to `git status`, but they are gigabytes of stale checkouts and they poison
  grep/find/tooling runs.
- **Six local `claude/*` branches**, only one of which (`claude/ponytail-ultra-d41592`) exists on
  `origin`: `claude/design-ce0850`, `claude/design-hierarchy-2026-07-23`,
  `claude/design-polish-2026-07-23`, `claude/screenshot-evidence-systemic-fixes-d07eb2`,
  `claude/vision-design-2026-07-23`.
- **Two stashes**, both from branches that no longer exist:
  `stash@{0}` "On fix/security-messaging-hardening: wip-unrelated-outside-security-pr",
  `stash@{1}` "On claude/amazing-swanson-8e9f62: codex-preserve pre-23b tracked dirty work".
- **Untracked files at rest**: `.claude/settings.json`, `tools/CLAUDE-OPENROUTER-SETUP.md`.
- **Stray build/debug artifacts**: `apps/web/debug.log`, `apps/web/web.log`, `apps/web/test-results/`,
  `apps/web/coverage/`, `apps/web/tsconfig.tsbuildinfo`, `apps/mobile/coverage/`,
  `apps/mobile/dist/`, `apps/mobile/tsconfig.tsbuildinfo`. Some are gitignored, some are not —
  determine which, then either ignore them or delete them. `*.log` is already ignored; verify no
  tracked log files exist.
- **A dead absolute path in shipped tooling**: `apps/web/e2e/shots.mjs` defaults `OUT_DIR` to
  `C:/Users/osama/AppData/Local/Temp/claude/C--LinkedIn--claude-worktrees-zealous-bassi-ff4cee/...`,
  a temp directory belonging to one of the prunable worktrees above. Repoint it to a repo-relative,
  gitignored location.
- **Line-ending drift**: `(public)/legal/terms/page.tsx` and `(public)/legal/tos/page.tsx` have
  byte-identical content but different line endings. `.gitattributes` exists — check whether it
  actually covers `*.tsx` and normalize.

**Do:**

1. Snapshot the starting state to the ledger: `git status --short`, `git log --oneline -30`,
   `git branch -vv`, `git worktree list`, `git stash list`.
2. Inspect both stashes with `git stash show -p`. Decide, per stash, whether the diff is (a) already
   in `main`, (b) worth salvaging, or (c) dead. Salvage anything real onto your branch as its own
   commit. Then drop them. Record what each contained and the disposition — this is exactly the kind
   of thing that gets dropped blind and then missed for a year.
3. For each local `claude/*` branch: diff it against `main` (`git log main..<branch> --oneline`,
   `git diff main...<branch> --stat`). Anything not already in `main` and still relevant gets
   cherry-picked or ported onto your branch. Then delete the branch. Record the disposition of every
   one. Cross-check against `gh pr list --state all --limit 100` so you know which were merged
   under a different name.
4. `git worktree prune`, then `git worktree remove --force` anything still registered, then delete
   the orphaned `.claude/worktrees/*` directories from disk. Confirm `git worktree list` shows only
   the main checkout.
5. Resolve the two untracked files: commit, ignore, or delete — each with a reason.
6. Confirm zero conflict markers across all tracked files, including `docs/`, `.json`, and `.md`.
7. `git gc --prune=now`. Then `pnpm install --frozen-lockfile` and confirm the lockfile is unchanged
   afterwards (`git diff --exit-code pnpm-lock.yaml`).
8. Verify against the remote with `gh`: `gh repo view`, `gh pr list --state open`,
   `gh run list --limit 20`. Any open PR or red CI run on `main` is a finding.

**Gate 0**: working tree clean, one worktree, no stale local branches, no stashes, lockfile stable,
all five static gates from §4 green. Commit. Do not proceed until this holds.

---

## 6. Phase 1 — Reconcile the contract

The docs are the agent-facing API of this repo, and they currently lie in at least one place.

1. Read, in the order given, the eight documents in §3.
2. Read `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`, `docs/HANDOFF.md`,
   `docs/HANDOFF-FABLE5.md`, `docs/HANDOFF-FABLE5-2026-07.md`, `docs/design/PARITY.md`,
   `docs/design/vision-qa-2026-07-23.md`, `docs/design/screen-critique-2026-07.md`.
3. Produce one live status document and mark the others historical. Fix `CLAUDE.md` so
   "What to build next" points at the live one. Every claim you carry forward into the live document
   must be verified against code — the existing handoffs contain items marked open that are closed
   and vice versa. Delete or strike claims you cannot verify; do not launder them forward.
4. Extract from `docs/design/vision-qa-2026-07-23.md` the "Known follow-ups", "Not changed", and
   "Harness traps" sections into your working list. Those are prior-pass debts, and several are the
   kind of thing that re-breaks.

**Gate 1**: one authoritative status doc, `CLAUDE.md` pointing at it, every stale doc headed with a
one-line superseded notice. Commit.

---

## 7. Phase 2 — Build the evidence harness before you judge anything

You cannot review a UI you have not seen. Get both platforms rendering real data locally, then make
screenshot capture repeatable.

**Web:**

1. Bring up Postgres, `pnpm --filter @baydar/db db:deploy`, `pnpm --filter @baydar/db db:seed`.
   Then `pnpm --filter @baydar/db qa:load-fixture -- --run-id=opus5-review --users=2` for a
   completed-profile account (the `demo@baydar.ps` seed user intentionally routes to mandatory
   onboarding, which is itself a screen you must capture).
2. `pnpm dev` (or API + web separately: API on 4000, web on 3000 — that is what `shots.mjs` expects).
3. Fix `shots.mjs`: repo-relative gitignored `OUT_DIR`, and extend its route list to cover **every**
   route that exists, not the 29 it currently walks. Cross-check its list against the 46 `page.tsx`
   files. Missing today include at minimum the five `(public)/legal/*` pages, `(admin)/moderation`,
   `(admin)/billing`, `(app)/employer/new`, `(app)/employer/[slug]/jobs/new`,
   `(app)/employer/[slug]/jobs/[jobId]/applicants`, `(auth)/*`, and the locale root landing page.
   Auth routes need a signed-out context — add one rather than skipping them.
4. Capture the full matrix: every route × {ar-PS, en} × {light, dark} × {1440×900, 390×844}. Then
   **look at every image.** Not a sample. Crop and zoom into any region you are unsure about rather
   than guessing from the full-page thumbnail — iterative crop-and-inspect is how you catch the
   4px misalignments and the clipped Arabic descenders.
5. Read every `_console__*.json`. Console errors are findings. `MISSING_MESSAGE` in particular means
   a translation key is unresolved at runtime even when the JSON on disk is correct (see §9).

**Mobile — this harness does not exist yet; build it:**

6. Stand up an Android emulator with the Expo dev build (`pnpm --filter @baydar/mobile start`).
   Write `apps/mobile/e2e/shots.mjs` (or a Maestro flow set using `takeScreenshot`) that walks every
   one of the 38 screens across {ar-PS, en} × {light, dark}, driving navigation deterministically
   and dumping PNGs to a gitignored directory the same way the web harness does. Deep links
   (`baydar://`) are the cheapest way to jump straight to a screen — the app already registers them.
7. Capture the mobile matrix. Look at every image. Compare each screen side by side with its web twin
   against the parity contract in `design-handoff-2026-06/README.md`.
8. Commit both harnesses with a README section explaining how to re-run them. This harness is a
   deliverable in its own right — the next review must not start from zero.

**Gate 2**: two working screenshot harnesses committed, full matrices captured for both platforms,
console logs collected, every image viewed. Report counts: images captured, routes covered,
routes that failed to render, console errors by route.

---

## 8. Phase 3 — The audit passes

Score every screen on the repo's own five dimensions from `docs/design/screen-critique-2026-07.md`:
**philosophy / hierarchy / detail / functionality / restraint**, 1–10, **ship gate ≥ 7**. Anything
below 7 on any dimension is a defect with a required fix, not an opinion.

Run these passes. Record findings as you go; do not fix yet except for one-line obvious wins.

**3a. Visual system compliance.** Per screen, per locale, per theme, per viewport: token adherence
(no raw hex, no rem/px literals, no Tailwind default palettes — `pnpm lint:tokens` catches source
but not runtime); surface variant discipline (`flat`/`card`/`hero`/`tinted`/`row` per DESIGN.md
§5.6 — the "everything is a card" failure was fixed on three routes in PR #89, check the rest);
spacing/radius/shadow from tokens; type scale; olive brand with terracotta accent and no generic
blue anywhere; commit-action colour consistency (DESIGN.md §6.7).

**3b. RTL and Arabic correctness.** Physical properties (`left`, `right`, `margin-left`,
`padding-right`) are bugs — logical only. Mirrored glyphs and directional icons (hardcoded `←`
pointing the wrong way was a real finding). Bidi isolation on every user-content leaf (`dir="auto"`
plus the `bidi-plaintext` utility for alignment). Arabic-Indic digits everywhere a number renders —
next-intl formats only ICU `{x, number}` and plural `#`; a bare `{x}` placeholder and every raw JSX
`{count}` leak Latin digits. ICU plurals for Arabic's zero/one/two/few/many/other. No hardcoded
English string in any component; `ar` exists first, `en` is the fallback. Check every string in
`apps/web/messages/*.json` and the mobile catalog for missing keys in either locale.

**3c. Layout integrity.** Horizontal overflow at 390px on every screen. Clipping, truncation,
overlap, orphaned labels, wrapped buttons. Empty, loading, error, and offline states for every
surface — capture each deliberately by intercepting the API, not by hoping to catch one. Long-content
and long-name stress: a 60-character Arabic name, a 300-word post, a job title with no spaces.

**3d. Functional correctness.** This is where the "some functionality does not work as expected"
lives, and the repo has a documented precedent: `PostCard` shipped with `onRepost` and `onShare`
as `onClick={undefined}` — two dead buttons live for weeks because the host route never passed the
handlers. Systematically:

- Every interactive element in `packages/ui-web` and `packages/ui-native`: enumerate its handler
  props, then grep every host call site and confirm the handler is actually passed. A control whose
  handler is `undefined` either gets wired or gets removed — DESIGN.md's rule is that a glyph which
  does nothing is worse than no glyph.
- Every form: submit, validation, field-local error display, success feedback, double-submit
  guarding, disabled-while-pending.
- Every navigation affordance: does it land somewhere real? Dead-end screens with no way forward
  (the search-people dead end was a prior finding) are defects.
- Optimistic updates: do they roll back on failure? Are counts consistent after refetch?
- Every UI promise the backend cannot keep. Precedent: `/me/premium` said "وألغِ متى شئت" (cancel
  anytime) while nothing in the codebase ever wrote `cancelAtPeriodEnd`. Read the copy, then find the
  endpoint that makes it true. If it does not exist, the copy is a lie and either the copy or the
  endpoint changes.
- Auth/session: token refresh, expiry, logout, protected-route redirects on both platforms.
- SSE/live updates: reconnect after network loss, resume, no duplicate events.
- `viewer`-scoped DTOs (`viewer`, `hasApplied`, connection state, unread state) must never be
  publicly cached — private/no-store only. Audit every API route and every Next.js fetch/route
  handler for this.

**3e. Accessibility.** Every interactive element: accessible label, keyboard operable, visible focus
ring, 40px (web) / 44pt (mobile) hit target. Heading order. Contrast in both themes.
`pnpm --filter @baydar/web test:a11y` must pass, and passing it is the floor, not the ceiling —
walk the app by keyboard yourself.

**3f. Cross-platform parity.** Web/native component pairs must share names, variant names, prop
vocabulary (`onClick`/`onPress`), and behaviour. Fill in the matrix in `docs/design/PARITY.md`
against what the code actually does now. **Verify before you copy**: the prior pass nearly propagated
the dead-button bug to mobile in the name of parity. Route-level gaps to adjudicate, verified: web
has `(public)/legal/*` ×5, `cv`, `(public)/j/[id]`, `(app)/employer/new`, and the two `(admin)`
surfaces with no mobile twin; mobile has `composer.tsx` with no web route. Each gap is either
intentional (record it in the contract) or a hole (fill it).

**3g. Dead and duplicated code.** Verified starting point: `(public)/legal/terms/page.tsx` and
`(public)/legal/tos/page.tsx` both render `<LegalPage kind="tos" />` — identical files, so
`/legal/terms` is a duplicate route serving the wrong document or a route that should not exist.
Check `LegalKind` for which kinds exist and which have no route. Then sweep for the same class of
problem: unused exports, duplicated formatters (a local `formatSalary` shadowing the shared
`formatSalaryRange` was a prior finding), components exported but never mounted, message keys with no
consumer, dead API endpoints. Note that `ts-prune` against a single tsconfig is useless here —
cross-package usage is invisible to it; use `knip --workspaces` or grep the call sites.

**3h. The 11 over-300-LOC allowlisted files.** `pnpm qa:design` warns on
`billing.service.ts` (792), `messaging.service.ts` (700), `companies.service.ts` (637),
`search.service.ts` (442), `seed.ts` (438), `profiles.service.ts` (415), `karama.service.ts` (384),
`auth-tokens.service.ts` (378), `connections.service.ts` (378), `qa-load-fixture.ts` (362),
`notifications.service.ts` (303). Read each one looking for real defects — long service files are
where the correctness bugs hide. Refactor only where a fix requires it; do not do a cosmetic split
that churns 800 lines and buys nothing.

**Gate 3**: `docs/audit/OPUS5-REVIEW-<date>.md` written, containing every finding with route,
platform, locale, theme, viewport, evidence pointer (screenshot filename or file:line), rubric
scores per screen, and a severity bucket: **P0** launch-blocking (data loss, security, dead primary
action, broken auth, false promise to a paying user), **P1** visibly broken or off-system on a
primary flow, **P2** polish and secondary flows, **P3** nits. Report the finding count per bucket.

---

## 9. Traps this repo has already paid for — do not rediscover them

From `docs/design/vision-qa-2026-07-23.md` and the PR history. Read these before you debug anything.

- **`packages/ui-web` edits need a dev-server restart.** The web app consumes the kit as source
  (`main: ./src/index.ts`); a running `next dev` keeps serving the pre-edit module and your new class
  is simply absent from the DOM.
- **`apps/web/messages/*.json` edits need `.next` deleted**, not just a restart
  (`Remove-Item -Recurse -Force apps\web\.next`). Otherwise the client message payload keeps the old
  snapshot, `t()` renders the key path, and the console throws `MISSING_MESSAGE` while the JSON on
  disk is perfectly correct.
- **tailwind-merge eats `text-*` utilities.** It reads any `text-…` class as a text colour and drops
  it when a real colour class follows in the same `cx()` call. That silently disabled a bidi fix on
  one surface while an adjacent one using plain `className` worked. This is why the naming is
  `bidi-plaintext` and not `text-user`. Confirm such fixes by reading computed style, never by
  looking at the screenshot.
- **Screenshots taken too early are blank.** Skeletons outlive `networkidle`; wait for
  `.animate-pulse` to clear.
- **`dir="auto"` fixes word order but changes alignment.** Latin-only strings jump to the wrong edge
  of an RTL column. Ordering and alignment are two separate fixes.
- **Playwright's API bind port must match the port its health URL polls.** The config derives one
  from the other for exactly this reason; do not hardcode around it.
- **The demo seed user routes to mandatory onboarding** because it has no professional background.
  Use the QA load fixture for a completed-profile session.

---

## 10. Phase 4 — Fix

Work the buckets in order: every P0, then every P1, then every P2, then P3 as time allows —
and "time allows" means you keep going, since there is no clock on this run.

For each fix:

1. **Root-cause it.** Fix the cause, not the symptom, and fix it at the lowest layer that owns the
   problem. The bank-IBAN placeholder leak was fixed in the contract (`BillingCatalog.bankTransfer`
   nullable, API refuses unconfigured checkouts, both clients render the method disabled) rather than
   by patching one string on one screen. Do that.
2. **Fix the class, not the instance.** If one route leaks Latin digits, every route that renders a
   number is suspect — sweep them all in the same commit.
3. **Keep web and native in lockstep.** A component change in `packages/ui-web` gets its
   `packages/ui-native` twin in the same commit, same prop names, same variant names. Shared UI
   imports nothing framework-specific (`next/*`, Expo Router, app-only APIs).
4. **Tokens first.** If a fix needs a value that is not tokenized, add the token to
   `packages/ui-tokens`, then consume it. Never hardcode.
5. **Add the regression test.** Every P0 and P1 fix gets a test that would have caught it: a
   Playwright assertion, a unit test, a `visual.spec.ts` snapshot, a Maestro step, or a new
   `lint-tokens`/`qa:design` rule when the defect is a whole class. The repo has only two committed
   visual snapshots today against a 29-route matrix — that ratio is part of why this review was
   necessary. Widen it.
6. **Re-shoot the proof.** Re-run the relevant harness cell and look at the new image. Paste the
   before/after filenames into the ledger. A fix without a re-shot screenshot is not done.
7. **Commit.** One logical change, one commit, message naming the finding id from the audit doc.

Between batches, run the static gates (`lint`, `format:check`, `lint:tokens`, `qa:design`,
`type-check`, `check:release-placeholders`). Catching a regression six commits later costs far more
than the two minutes.

---

## 11. Phase 5 — Launch readiness

The bar is "hand this to real users", not "CI is green".

1. Every gate in §4 green, from a clean install, in one uninterrupted run. Paste the actual commands
   and their exit codes.
2. Full web screenshot matrix re-captured post-fix, every image viewed, zero P0/P1 open.
3. Full mobile matrix re-captured post-fix, same bar.
4. `pnpm --filter @baydar/web e2e` green including `a11y`, `safety`, `billing`, `moderation`,
   `growth`, `ux-sad-path`, `full-flow`, `visual`.
5. Maestro flows run against the emulator; record pass/fail per flow.
6. Lighthouse via `apps/web/lighthouserc.json` and `lighthouserc.mobile.json`; report the numbers
   against the configured assertions.
7. Security sweep: `apps/web/scripts/assert-security-headers.mjs`, CSP, rate limits on public auth
   routes, media presign MIME/size limits, production CORS behaviour with empty `CORS_ORIGINS`, JWT
   refresh rotation and revocation, no secret or placeholder in tracked files, no viewer-scoped data
   in a public cache.
8. Data safety: migrations apply cleanly forward on an empty database; seed and QA fixture both
   work; account deletion, 30-day restore, and export do what the docs claim.
9. Confirm the release-blocking placeholders that are genuinely environment-level — Apple team id,
   Android release SHA256, EAS project id, Sentry/PostHog production values, real mail provider —
   are the _only_ placeholders left, each listed in `BLOCKED` with the exact value needed and who
   supplies it.

---

## 12. Deliverables

Commit all of these on `review/opus5-launch-readiness`:

1. `docs/audit/OPUS5-REVIEW-<date>.md` — every finding, evidence pointer, rubric score per screen,
   severity, disposition, before/after screenshot filenames.
2. `docs/audit/OPUS5-CLEANUP-<date>.md` — Phase 0 ledger: worktrees removed, branches disposed of
   with per-branch reasoning, stash contents and disposition, files deleted or ignored, before/after
   `git worktree list` and `git branch -vv`.
3. One reconciled live status document, with the superseded ones marked.
4. Updated `docs/design/PARITY.md` reflecting the code as it now is.
5. `apps/web/e2e/shots.mjs` (fixed, full route coverage) and the new mobile screenshot harness, both
   documented for re-running.
6. Widened regression coverage: new Playwright specs/snapshots, unit tests, Maestro steps, and any
   new lint rules.
7. `docs/audit/OPUS5-VERDICT-<date>.md` — the launch call. Lead with a one-line verdict: ship /
   ship-with-caveats / do-not-ship, and why. Then: gate results with exit codes, findings closed by
   bucket, findings deliberately left open with reasoning, `BLOCKED` items with the exact input each
   needs, and the top five structural risks that will bite the next six months of development. Write
   this as a staff engineer writing for the person who has to make the call — recommendations, not
   options; no hedging, no padding.

Push the branch and open a PR against `main` with a body that summarizes the verdict and links the
three audit documents.

---

## 13. Definition of done

- Working tree clean, one worktree, no stale branches, no stashes, lockfile unchanged.
- Every CI gate green from a clean install, in one run, with pasted exit codes.
- Both screenshot matrices captured post-fix and fully reviewed; zero open P0 or P1.
- Every screen scores ≥ 7 on all five rubric dimensions, or the exception is justified in writing.
- No interactive element in either app with a dead handler.
- No UI copy promising behaviour the backend does not implement.
- No hardcoded colour, dimension, or English string in any component.
- No physical CSS direction property in any styled surface.
- Web and native primitives in lockstep on names, props, and variants.
- Every P0/P1 fix has a regression test that fails without the fix.
- The three audit documents committed, the PR open.
- `BLOCKED` lists only items that require an input a human must supply, each named precisely.

Begin with Phase 0. Do not ask me anything.
