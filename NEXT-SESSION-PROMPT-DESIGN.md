# Baydar — design-system v2: close the open items, then raise the kit to first-tier interaction quality

You are working on **Baydar** (بيدر), the Arabic-first, RTL-by-default
professional network in `osama-2000236/palnet`. Two review rounds have merged:
PR #93 (`a4fcaa5`, mechanical) and PR #94 (`6ed3c66`, the judgement pass).
`main` is green — CI and Deploy both passed on `6ed3c66`.

This session has two halves that must happen in this order:

1. **Close the items round 2 left open.** They are enumerated, small, and each
   one has a written reason it was deferred. Do them first so the design work
   lands on a clean tree.
2. **Upgrade the design system** — `packages/ui-tokens`, `packages/ui-web`,
   `packages/ui-native` — to the interaction quality of a first-tier social
   product, and sync it to the Claude Design project via `/design-sync`.

Work on one branch, `design/system-v2`, cut from `main`. One logical change per
commit, conventional-commit subjects, English. Do not force-push.

---

## Execution contract

### Set `/ponytail full` — not off, not ultra

`ponytail@ponytail` and `caveman` auto-activate from a `SessionStart` hook in
`~/.claude/settings.json`, so you boot with `PONYTAIL MODE ACTIVE` at `full`.
Leave it there.

An earlier draft of this prompt said to turn ponytail off, reasoning that
"laziest solution that works" conflicts with a session that must not do half
work. That was wrong. Ponytail was active for all of round 2 and produced its
best fixes, every one via rung 2, _"already in this codebase"_:

| Round 2 outcome                                         | Rule that produced it                                          |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| Karama farming fixed by `award` → `awardOnce`, one word | Rung 2 — `awardOnce` existed, call site already passed the key |
| Blocked users dropped from suggestions                  | Rung 2 — reused `safety.getBlockedEitherIds`                   |
| Employer enums translated                               | Rung 2 — `jobs.typeLabels` existed all along                   |
| Three unstable pixel snapshots deleted                  | "Deletion over addition"                                       |
| Per-worker e2e schemas _not_ built                      | Rung 1, justified in writing — saved a day for a 2-minute gain |

Ponytail's never-simplify list already covers **accessibility basics** and
**anything explicitly requested** — the whole PART A ledger. It will not let you
skip this work; it will stop you rebuilding what the kit already has, which is
the failure mode a 35-item sweep is most prone to.

`ultra` is the one level that genuinely conflicts: it "challenges the rest of the
requirement", and PART A is a file:line-cited ledger, not a proposal.

### Skills — load these

| Skill                           | When                                   | Why                                                                                                                                                                                                               |
| ------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`frontend-design`**           | Before any visual decision. Not after. | The only thing addressing "first-tier without looking templated", and it names Baydar's exact failure mode — see the palette warning in Part 3. Run its plan → critique → build pass.                             |
| **`/code-review`**              | Self-audit, before shipping.           | Round 2's self-review found five defects in its own work, one a P1. You read what you meant; the tool reads what you wrote.                                                                                       |
| **`TaskCreate` / `TaskUpdate`** | First five minutes, then continuously. | One entry per Part 1 item and per Part 2 defect _class_. `completed` only when that item's check passes. A model that enumerated 14 items and finished 9 cannot honestly report done; one working from prose can. |
| **`ponytail:ponytail-debt`**    | Before shipping.                       | Harvests your `ponytail:` ceiling comments into a ledger so they do not rot. Output into `docs/audit/`.                                                                                                           |
| **`/run`**                      | After each layer of Part 2.            | Drives the real app. This repo's screenshots have lied five times; a running app is harder to fool.                                                                                                               |
| **`fewer-permission-prompts`**  | Early, once.                           | A long autonomous session dies by a thousand permission prompts. Genuine anti-stall measure.                                                                                                                      |

Skip `security-review` — this session is presentation, not the auth/billing/safety
paths round 2 hardened. Run it only if you touch those.

### Finish, then ship

One exit condition: **the Ship protocol at the bottom completes** — gates green,
PR open, CI green, merged. "A good stopping point" and "the rest is
straightforward" are not exit conditions.

If you genuinely run out of room, finish the item you are on, commit it, and
write the exact next step into `docs/audit/`. A half-finished component that
type-checks is worse than an untouched one: the next reader cannot tell which
half was intentional.

Grep your diff before each commit. These mean the work is unfinished:

```
TODO | FIXME | XXX | HACK | for now | temporary | placeholder | stub
not implemented | left as an exercise | wire this up later | in a future PR
```

A `ponytail:` comment naming a ceiling **and its upgrade path** is the exception
— that is a recorded decision. "Global lock, per-account locks if throughput
matters" is a decision; "TODO: handle concurrency" is a deferred job.

Ship nothing that nothing consumes. Round 1 found a dead 211-line `PremiumCheckout.tsx`
bound to a namespace that did not exist; round 2 found 52 non-route files and two
workarounds hiding them.

### What a completed item looks like

Worked example, from round 2 — use this shape:

> **R2-1, Karama farmable via the hire toggle.**
> _Found:_ reading `companies.service.ts` (§3h asked for it; round 1 skipped it).
> _Root cause:_ `updateApplicantStatus` awarded +200 via `karama.award`, which
> has no idempotency, and the guard only blocked `HIRED → HIRED` — so
> `HIRED → REJECTED → HIRED` minted 200 points per cycle.
> _Fix:_ `award` → `awardOnce`. One word. `awardOnce` already existed, the call
> site already passed `refType`/`refId`, and `KaramaLedger` already had the
> unique that makes it a one-time key.
> _Check:_ spec asserts `awardOnce` is called with the application id **and**
> that `award` is not. Broke it on purpose to confirm it fails.
> _Verified:_ api 327 passing.

Found → root cause → fix → check that fails when broken → verified. An item
without the last two lines is not done.

## Sequencing — this session is long, so order it to overlap

The mobile matrix takes about an hour of wall time and needs the tree frozen.
The design work needs the tree hot. Those two cannot overlap, so put the matrix
where it costs least:

1. **Open** — `stop ponytail`, `fewer-permission-prompts`, `TaskCreate` the
   whole list, commit the untracked design brief. Ten minutes.
2. **Part 1 code items** (1.2 P3s, 1.3 a11y capture) — small, independent,
   nothing depends on them. Land them.
3. **Start the mobile emulator and matrix (1.4) now**, before any design work,
   because it captures the _pre-change_ baseline you will compare against and
   because the tree is still clean. **Do not touch application code while it
   runs** — that is the mistake that cost round 2 an hour-long matrix.
4. **While the matrix runs**: read the design brief in full, run
   `frontend-design`'s plan-and-critique pass, and write the token additions
   (PART B1). Tokens are a different package; they do not disturb a mobile
   bundle that is already built.
5. **Review the matrix**, score the 38 screens, then do Part 1.1 (the three
   sub-7 screens) with that context.
6. **Part 2 proper** — web primitives, native twins, app wiring.
7. **Re-capture** whatever the design changes touched, self-audit, ship.

If the emulator fights you for more than 45 minutes, stop and say so — that is a
genuine environment blocker, and the rest of the session is worth more than
winning that fight.

---

## Read these first, in this order

| File                                                                   | Why                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CLAUDE.md`                                                            | Law. Tokens only, RTL-safe logical properties, Arabic-first, web↔native lockstep, framework-neutral `ui-*`.                                                                                |
| `docs/design/CLAUDE-DESIGN-UPGRADE-PROMPT-2026-07.md`                  | **The single most important file in this session.** A 334-line verified defect ledger for the design system, with file:line evidence for every claim. It is the spec. Do not re-derive it. |
| `docs/audit/OPUS5-ROUND2-2026-07-25.md`                                | Round-2 findings, corrections, and the shortcut ledger.                                                                                                                                    |
| `docs/audit/OPUS5-RUBRIC-2026-07-25.md`                                | Screen scores, 46 of 85, and the three sub-7 screens left for a design owner — that is you.                                                                                                |
| `.design-sync/NOTES.md`                                                | Repo-specific design-sync gotchas. Read before touching the sync. Non-optional.                                                                                                            |
| `.design-sync/conventions.md`                                          | What the Design agent is allowed to write.                                                                                                                                                 |
| `DESIGN.md`, `BRAND.md`, `docs/design/RTL.md`, `docs/design/MOTION.md` | The design contract.                                                                                                                                                                       |

**`docs/design/CLAUDE-DESIGN-UPGRADE-PROMPT-2026-07.md` is currently untracked.**
`git status` shows it as `??`. It survives only on this disk. **Commit it in your
first commit** before doing anything else — if it is lost, this session's spec is
lost with it.

---

## What is already verified — do not re-derive

The design brief was written against `a4fcaa5`. I re-checked seven of its
citations against `6ed3c66` (current `main`) before writing this prompt. **All
seven still hold at the exact line numbers cited:**

| Claim                                                       | Verified on `6ed3c66` |
| ----------------------------------------------------------- | --------------------- |
| A1.1 `Switch.tsx:54` thumb is `bg-white`                    | ✓ exact               |
| A3 `Switch.tsx:46` is `h-5 w-9` (20×36px)                   | ✓ exact               |
| A3 `Checkbox.tsx:85` is `h-4 w-4` (16×16px)                 | ✓ exact               |
| A2.3 `Tabs.tsx:49` roving `tabIndex={active ? 0 : -1}`      | ✓ exact               |
| A2.14 `Tabs.tsx:66` renders `{count}` raw                   | ✓ exact               |
| A1.5 `Dialog.tsx:143` `z-[1000]`, `Toast.tsx:120` `z-[100]` | ✓ exact               |

Treat the rest of the ledger as accurate. If you find one that is not, **say so
in the audit doc and fix the ledger** — that is a finding, not an inconvenience.

**One thing the brief predates:** PR #94 changed
`packages/ui-web/src/AppShellNav.tsx`. The nav strip and its buttons now carry
`h-full min-h-0` with `py-2` removed, because the buttons were sizing to their
content (89px) inside an `h-14` header and pushing the `-mb-px border-b-2`
active indicator 17px below the header border on every authenticated screen. Any
nav redesign must keep the strip exactly header-height. There is a measured
regression check in the round-2 doc; re-measure rather than assume.

---

## Part 1 — Close the open items

Do these first. All five are small. None is a design decision.

### 1.1 The three sub-7 screens (this is design work, and it is yours)

`docs/audit/OPUS5-RUBRIC-2026-07-25.md` scored 46 screens and left three below
the ≥7 ship gate, each deferred because it needed a design decision rather than
a defect fix. Make the decisions:

- **`/activity` — hierarchy 6.** Three stat cards of identical visual weight,
  led by a zero ("٠ تحديثات غير مقروءة"), then three different container
  treatments stacked down one page (bare stat cards → bordered list card → bare
  heading + loose cards). `CLAUDE.md` asks for the five surface variants to be
  used _intentionally_. Decide what `/activity` is for, then compose it that way.
- **`/employer/[slug]/jobs/[jobId]/applicants` — hierarchy 6.** The empty state
  is one line of text under a filter row. Every other empty state in the product
  — `employer`, `settings/blocked`, `/moderation`, `/billing`, `/saved` — uses
  the shared illustrated `EmptyState`. The one an employer sees first, right
  after posting their first job, gets the least. The `Illustration` kits
  (`outline`/`block`/`harvest`, 10 motifs) already exist.
- **The four `/legal/*` pages — functionality 6.** They render with no
  application chrome at all: no header, no nav, no back link. A member who
  follows the footer link can only leave with the browser back button. The copy
  being v0.1 placeholder is `BLOCKED` on counsel and is _not_ your problem; the
  missing shell is. The landing page's own minimal header is the obvious
  precedent.

### 1.2 The five recorded P3s

From `docs/audit/OPUS5-ROUND2-2026-07-25.md`. Each is a few lines:

- **R2-8** `companies.service.ts` `attachJobCounts` runs two `count()` queries
  per job, mapped over a page of up to 50 → 100 queries per page. Use `groupBy`.
- **R2-9** `POST /companies/:id/members` is `OWNER, ADMIN` but does not constrain
  `body.role`, so an ADMIN can mint an OWNER.
- **R2-10** `seedPlans()` in `packages/db/prisma/seed.ts` duplicates `PLAN_DEFS`
  in `apps/api/src/modules/billing/pricing.ts`, and `ensurePlan` overwrites the
  seed's copy on the first catalog read anyway. The real fix is moving
  `PLAN_DEFS` into `@baydar/shared`.
- **R2-11** `profiles.service.ts` `endorseSkill` assigns `awardOnce`'s return to
  a variable named `alreadyEndorsed` and early-returns when it is **false**. The
  logic is right; the name is exactly backwards.
- **R2-12** `apps/mobile/app/(app)/_layout.tsx` sets the notification badge to
  `0` on any `notification.read`, including a partial read. It self-corrects
  only because `markRead` publishes `notification.unread-count` immediately
  afterwards and SSE preserves order — an ordering guarantee the line does not
  mention.

### 1.3 The intermittent a11y failure — capture it, do not guess

`a11y authed: premium (ar-PS)` failed two full local Playwright runs and passed
two others. It passes alone and passed 8/8 under `--repeat-each=4`. **The
violation text was never captured**, so no cause is known and none should be
invented.

Run the full suite until it fires, with the axe output preserved:

```bash
cd apps/web && pnpm exec playwright test --workers=1 --reporter=list 2>&1 | tee /tmp/pw.log
```

`a11y.spec.ts:33-44` already builds a compact violation summary and throws it.
If it fires, the rule id, impact and target selectors are in that log. Fix the
violation. If it does not fire in three full runs, record that and move on —
do not spend the session on it.

### 1.4 The mobile screenshot matrix — the one genuinely owed item

38 mobile screens have never been eye-reviewed. Round 2 did not capture them
because an emulator plus Metro **from this worktree** is a known multi-hour
setup here, and because round 2 moved 52 mobile files from
`apps/mobile/app/(app)/_*/` to `apps/mobile/src/screens/*/` — bundling that
against a Metro instance from a different worktree would have produced a matrix
of the _previous_ code.

That risk is now the main reason to do it: the move is verified by 101 passing
tests including `app-shell-tabs.test.tsx`, which asserts the route table matches
what is on disk, but **no human has looked at a mobile screen since the move.**

```bash
# 1. Metro from THIS worktree — check nothing else holds 8081 first
netstat -ano | grep ":8081 " | grep LISTENING
pnpm --filter @baydar/mobile start --clear

# 2. Emulator (see memory: short worktree path beats MAX_PATH/CMake limits)
emulator -avd Pixel_7_Pro -gpu swiftshader_indirect -no-snapshot-load

# 3. API on 4000 from this worktree, then the matrix
node scripts/run-api-local.mjs .env.qa.local
node apps/mobile/e2e/shots.mjs
```

`apps/mobile/e2e/shots.mjs` now captures `adb logcat` per screen into
`_console__<locale>__<theme>.json` and prints i18n errors inline — that capture
is new in PR #94 and has **never been exercised**. Read those files. The web
equivalent is how two missing `messaging.*` message keys were found.

Then tile and review:

```bash
node apps/web/e2e/contact-sheet.mjs --in apps/mobile/.qa-shots --cols 4 --rows 3
```

Score the 38 screens on the same five dimensions and append them to
`docs/audit/OPUS5-RUBRIC-2026-07-25.md`. Compare each against its web twin;
`docs/design/PARITY.md` records the intentional gaps — anything not listed there
is drift.

---

## Part 2 — The design-system upgrade

`docs/design/CLAUDE-DESIGN-UPGRADE-PROMPT-2026-07.md` **is the specification.**
It contains a verified defect ledger (A1 tokens, A2 accessibility, A3 touch
targets, A4 interaction quality, A5 parity, A6 computed contrast), the control
briefs, motion choreography, deliverables, and acceptance criteria. Read it in
full. Implement it. Do not restate it, do not re-derive its findings, and do not
substitute your own judgement for a measurement it already made.

Your job is to add the three things that brief cannot do for itself:

### 2.1 Sequence it so the tree is never broken

The brief lists ~35 defects across three packages. That is not one commit.
Suggested order, because each layer is a dependency of the next:

1. **Tokens first** (`packages/ui-tokens`) — the brief's B1: a `z` layering
   scale, a `target` scale (`min: 44`, `compact: 40`), state-layer opacities,
   motion tokens. Nothing else can be fixed correctly until these exist, and
   `pnpm lint:tokens` + `pnpm qa:design` enforce that components consume them.
2. **Web primitives** (`packages/ui-web`) — touch targets (A3), then
   accessibility (A2), then interaction quality (A4).
3. **Native twins** (`packages/ui-native`) in the same commit as their web
   counterpart, per `CLAUDE.md`'s lockstep rule. A1.2 is the big one: 14 files
   call `StyleSheet.create` at module scope, freezing colours to the light
   palette, so **the native app shell does not re-theme in dark mode at all.**
4. **App wiring** (`apps/web`, `apps/mobile`) — the skip link (A2.8), the
   `formatCount` injection for `Tab` (A2.14).

### 2.2 Make every claim falsifiable before you claim it

This repo's recurring failure is a check that looks like coverage and is not.
Round 1 found three guards that existed and ran nowhere. Round 2 found a
harness that lied five separate ways. For each defect class the brief lists,
land the check that fails if it regresses:

| Class                 | The check that must exist afterwards                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A3 touch targets      | An automated sweep asserting no interactive element in either kit renders below the token minimum, at every size variant. Do not eyeball this — measure `getBoundingClientRect()` in a Playwright pass, and use `hitSlop`-aware measurement on native. |
| A2.3 tabs keyboard    | A test that presses Arrow/Home/End on a `Tabs` and asserts focus moves — `apps/web/e2e/keyboard.spec.ts` already exists and already walks 13 surfaces; extend it.                                                                                      |
| A1.2 native dark mode | A render test that mounts the native shell under a dark theme and asserts a colour actually changed. The bug is that it does not.                                                                                                                      |
| A1.5 z-layering       | A lint rule or `qa:design` check that fails on a hardcoded `z-[...]` or `zIndex:` numeric.                                                                                                                                                             |
| A6 contrast           | Compute ratios from the shipped token hex values in a test, not by eye. The brief already computed them — pin them.                                                                                                                                    |
| A2.11 toast timing    | A test that a toast with an action never auto-dismisses, and that hover pauses it.                                                                                                                                                                     |

`pnpm qa:design` already enforces a 300-LOC ceiling and will go red if you grow
a component past it. That is a real gate — split honestly rather than
allowlisting. PR #94 crossed it twice and split both files.

### 2.3 Run the design-sync loop, and read `NOTES.md` before you do

`/design-sync` targets the Claude Design project **"Baydar Design System v2"**
(`.design-sync/config.json`, `projectId c6957d8f-df0f-47ed-a91d-6e252067a70f`).
Current state: 34 `ui-web` components, 33 previews in `.design-sync/previews/`.

`.design-sync/NOTES.md` documents four traps that each cost a debugging cycle.
The two that will bite you hardest:

- **`packages/ui-web` ships no CSS.** It builds with plain `tsc`; components are
  styled entirely by Tailwind utility strings that `apps/web` compiles at
  app-build time. A naive sync produces 33 fully-functional, completely unstyled
  components. `.design-sync/ds-styles/` compiles the sheet;
  `sh .design-sync/rebuild.sh` from the repo root does CSS + converter in one go.
- **The safelist is load-bearing.** It is generated off the token preset, so it
  cannot drift. Before it existed, 11 of the 44 documented utility families
  simply were not in the shipped sheet and resolved to nothing, silently.
  **Consequence: arbitrary-value utilities never work in generated designs** —
  no `max-w-[560px]`, no `text-[15px]`. If your redesign needs a value, add a
  token.

`packages/ui-native` is **not** covered by design-sync — the config's `pkg` is
`@baydar/ui-web` only. Native parity is manual and is on you.

When you add or change a component, add or update its preview in
`.design-sync/previews/`. Previews must export **component functions**, must
import from `"@baydar/ui-web"`, and must not set `dir` (RTL comes from
`ds-styles/input.css`). Verify props against the source — esbuild strips types
without checking them, so a wrong prop name renders silently wrong. Lift Arabic
copy from `apps/web/messages/ar-PS.json` rather than inventing it.

---

## Part 3 — "First-tier social product": make it testable, not a vibe

The requirement is that Baydar feel like a top-tier social network. That is the
least falsifiable sentence in this prompt, so convert it into things that can be
measured before you build to it. **Baydar must not look like LinkedIn** —
`CLAUDE.md` is explicit: "If a design decision would make Baydar look like
LinkedIn, pick the different one." Olive/terracotta, warm, Arabic-first stays.

### The palette warning — verified, and it applies to Baydar

The `frontend-design` skill lists the three looks AI-generated design currently
clusters around. The first is: _"a warm cream background (near `#F4F1EA`) with a
high-contrast serif display and a terracotta accent."_

Baydar's shipped tokens are `--surface-muted: #faf9f5` and `--surface-subtle:
#f1efe7`, with a terracotta accent on all four commit actions. `#f1efe7` against
`#F4F1EA` is a difference of three, two and three points per channel. **Baydar's
palette is that cluster, almost exactly.**

This is not a reason to re-palette. The skill's own rule is that the brief wins
where it pins a direction, and `BRAND.md` plus `CLAUDE.md` pin olive/terracotta
hard. Changing it would also invalidate the computed contrast ratios in PART A6
and every token consumer in two kits.

It _is_ a reason to know where your distinctiveness cannot come from. Adding
more cream and more terracotta is the templated move, and it is the one most
likely to feel like an upgrade while being the opposite. Spend the boldness on
the axes the brand does not pin:

- **Typography** — the type scale, weights, and the display/body pairing. Arabic
  typography is a real differentiator almost nobody executes well, and this is
  an Arabic-first product. The `.design-sync/fonts/` directory already exists.
- **The signature element** — the skill's term: the one thing the product is
  remembered by. Baydar has a wheat mark and an olive circle on the landing page
  and nothing equivalent inside the app.
- **Motion** — `docs/design/MOTION.md` exists and PART B3 revises it. An
  orchestrated moment beats scattered effects.
- **Structure** — the five surface variants (`flat`, `card`, `hero`, `tinted`,
  `row`) already exist and `/activity` misuses them by stacking three at random.
  Using them to encode meaning is free distinctiveness.

Run `frontend-design`'s plan-then-critique pass before writing any of this.
Its instruction — work through the same brief and see whether you arrive
somewhere generic, and revise the parts that do — is the check that stops this
from becoming a reskin.

What "first-tier" actually decomposes into, all measurable:

| Property                    | Target                                           | How to verify                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input responsiveness        | INP < 200ms at p75                               | Lighthouse is already wired (`lighthouserc.json` + `.mobile.json`, both in CI). Add INP if it is not asserted.                                                                                                |
| Every press acknowledged    | A state layer or scale response within one frame | The brief's A4. Native `Button` already derives `hitSlop` from `SIZE_HIT_TARGET` — the brief says copy that pattern.                                                                                          |
| No layout shift             | CLS ≤ 0.1                                        | Already asserted in CI, currently 0–0.002. Do not regress it.                                                                                                                                                 |
| Skeletons, never spinners   | Every async surface                              | `Skeleton` and `PostCardSkeleton` twins already ship. `/me` is a redirect stub that renders a text "جارِ التحميل…" line — that is the exception, and it is why `shots.mjs` now waits on `[aria-busy="true"]`. |
| Optimistic writes roll back | Every mutation                                   | Partially built: `useRoomMessages` marks failed optimistic sends and retries with the same `clientMessageId`, and there is a test. Audit the rest.                                                            |
| Motion respects the user    | `prefers-reduced-motion` honoured everywhere     | `docs/design/MOTION.md` exists; the brief's B3 revises it.                                                                                                                                                    |

**Usability rules to hold yourself to — verify these numbers, do not trust this
prompt.** I could not run a web search in the session that produced this file,
so treat the following as "check the spec text before citing it":

- **WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA** — 24×24 CSS px, with
  documented exceptions (spacing, inline, user-agent, essential).
- **WCAG 2.2 SC 2.5.5 Target Size (Enhanced), Level AAA** — 44×44 CSS px.
  `CLAUDE.md` already mandates 44pt mobile / 40px web, which is stricter than AA
  — hold the repo's own line, it is the higher bar.
- **SC 2.4.7 Focus Visible (AA)**, **SC 2.4.11 Focus Not Obscured (AA, new in
  2.2)**, **SC 1.4.3 Contrast Minimum (AA)** 4.5:1 body / 3:1 large,
  **SC 1.4.11 Non-text Contrast (AA)** 3:1 for UI components and graphics,
  **SC 2.2.1 Timing Adjustable (A)** for the toast.
- **ARIA Authoring Practices Guide** tabs pattern for A2.3 — Arrow keys must be
  RTL-aware here, which the generic pattern does not say.
- Apple HIG 44×44pt and Material 48×48dp are the platform baselines; the repo's
  44pt already satisfies HIG and is 4dp under Material's.

Nielsen's heuristics worth naming because the rubric already punishes their
absence: **visibility of system status** (the offline banner, the SSE reconnect
state), **user control and freedom** (the legal pages have no way back),
**recognition over recall** (`/settings/security` printed raw user-agent strings
until PR #94 — nobody can recognise their own device in a UA string), and
**error recovery** (every error state needs a retry that works).

---

## Two findings handed to you, already confirmed on screen

Found while writing this prompt, by cropping a shipped screenshot from round 2's
matrix (`apps/web/.qa-shots/profile-public__ar-PS__light__mobile.png`). Neither
is in the design brief. Both are on `/in/[handle]`, a public profile page.

### F1 — the `Tabs` active underline detaches when tabs wrap

At 390px in `ar-PS` the profile tab strip wraps: `نبذة | الخبرات | التعليم |
المهارات` on the first row, `النشاط` pushed onto a second. The active tab's
olive `border-b-2` is drawn under the **first row**, floating in the middle of
the component, nowhere near the container's bottom border.

`Tabs.tsx:26` is `flex flex-wrap … border-b` and `Tabs.tsx:52` is
`-mb-px … border-b-2`. `-mb-px` only lands on the container's border when the
tab is on the last row. Wrapping breaks the assumption silently.

This is the **same family** as the nav bug PR #94 fixed — an `-mb-px border-b-2`
indicator whose container does not guarantee the element sits on the bottom edge
— but a different mechanism: the nav's container had a fixed `h-14` and
oversized children; `Tabs` has no height constraint and wraps. Fixing one did not
fix the other. `AppShellProfileMenu.tsx:87` uses the same pattern and was
measured at 0px offset, so it is fine; check it again if you touch it.

Arabic labels are wider than their English equivalents, so this reproduces in
`ar-PS` and may not in `en`. Reproduce at 390px in Arabic before and after.

### F2 — A2.14 is confirmed visually, not just by code-read

The same crop shows the experience count rendering as a Latin `1` inside an
otherwise Arabic-Indic UI. The brief predicted this from `Tabs.tsx:66`; it is
now visible in a shipped screenshot on a public page. Fix it with the injected
`formatCount` prop the brief specifies — do not invent a third mechanism.

---

## The review method that worked — reuse it, do not reinvent it

Round 2 scored 46 screens without drowning. What made it tractable:

- **Contact sheets, not one image at a time.** `apps/web/e2e/contact-sheet.mjs`,
  4 columns × 3 rows, `--tile-w 340 --tile-h 470`. That density is calibrated:
  composition, hierarchy, empty-vs-full and outright breakage all read at tile
  size. Detail does not — open the full-resolution PNG for anything uncertain.
- **Crop and zoom for detail.** Both findings above came from a `sharp` extract
  plus a nearest-neighbour upscale of a ~40px-tall strip. A 4–5× zoom on a
  suspicious region is the difference between "looks fine" and a confirmed bug.
- **Read `_console__*.json` before believing any sheet.** That file is what
  identified round 2's corrupted matrix, and what turned "three employer screens
  crash on mobile" back into "my own hot reload".
- **Judge nothing from a thumbnail.** Round 2 read a contact sheet as "content
  pinned to one side" and was wrong — RTL text inside a centred container reads
  as right-hugging at 340px wide. Full resolution settled it.

---

## Traps this repo has already paid for

Each cost real debugging time. Read before you debug anything. The full history
is in `docs/audit/OPUS5-ROUND2-2026-07-25.md`; these are the ones you will hit.

**Never edit application code while a screenshot matrix is running against a
live dev server.** This cost round 2 a full hour-long matrix: the dev server
hot-reloaded mid-run, every subsequent authenticated shot captured the error
boundary, and the contact sheet read as a mobile-only crash until the console
capture named the real cause. Freeze the tree, run the matrix, then edit.

**The harness fails silently, always.** A login screen, a spinner, a blank
screen and a redirect interstitial are all "valid" renders. Five separate
harness defects have been found this way. The defences that actually worked:
hash the output and look for duplicate images, and **read `_console__*.json`
before believing a contact sheet.**

**tailwind-merge eats `text-*` utilities.** It reads any `text-…` class as a
colour and drops it when a real colour follows in the same `cx()`. That is why
the bidi helper is named `bidi-plaintext` and not `text-…`. Do not rename it,
and do not introduce utilities whose names collide with a Tailwind prefix.
Confirm such fixes by reading computed style, never from a screenshot.

**`dir="auto"` fixes word order but changes alignment.** Ordering and alignment
are two separate fixes.

**`apps/web/messages/*.json` edits need `.next` deleted**, or `t()` renders the
key path while the JSON on disk is correct and the console throws
`MISSING_MESSAGE`.

**Stopping a dev-server task does not always kill the `next dev` child.** If the
next start says "Port 3000 is in use … using 3001", a stale process is holding
it and the server you are testing is not the one you just started.

**Playwright keys snapshots by platform.** A baseline generated on win32 will
fail CI on Linux with "A snapshot doesn't exist". Round 2 deleted its pixel
snapshots for this and other reasons — they failed three times for three
different causes, and each fix masked one more volatile region. **Prefer content
assertions over pixel snapshots for anything rendering live data.**

**Metro needs `--clear` when it wedges**; a poisoned cache presents as the app
hanging at "Bundling 100%". The emulator sometimes needs `-no-snapshot-load`.

**Maestro cannot type Arabic** (`Unicode character input is not supported`,
mobile-dev-inc/maestro#146) and matches Arabic **exactly, not as a substring**.

---

## Environment

Windows / PowerShell, repo root `C:\LinkedIn`, pnpm 9.12.0, Node 20 (`.nvmrc`).
`rm -rf` does not exist — `Remove-Item -Recurse -Force`, and
`-LiteralPath "\\?\<path>"` to beat MAX_PATH.

```bash
node scripts/run-api-local.mjs .env.qa.local     # API on 4000
pnpm --filter @baydar/web dev                    # web on 3000
pnpm --filter @baydar/mobile start --clear       # Metro on 8081
```

`.env.local` has 28/29-character JWT secrets, below the ≥32 minimum — use
`.env.qa.local`. `BANK_TRANSFER_IBAN` is empty there, so `billing.spec.ts` fails
until you set one; that is a `BLOCKED` credential, not a defect, and it is the
one expected Playwright failure. Verified: setting a test IBAN turns it green in
34.5s.

Emulator: `Pixel_7_Pro`, `-gpu swiftshader_indirect`. Dev client `ps.baydar.app`
is installed. Set `adb reverse tcp:8081` and `tcp:4000`.

---

## The done gate

Every line here is objective. None of it is a judgement call, which is the
point — you do not get to decide you are finished.

**Work items**

- [ ] `CLAUDE-DESIGN-UPGRADE-PROMPT-2026-07.md` committed (it is untracked today).
- [ ] Every open item in Part 1 closed, or the exception justified in writing.
- [ ] The three sub-7 screens re-scored ≥7, post-fix screenshot as evidence.
- [ ] 38 mobile screens captured, **every image viewed**, scored on all five
      dimensions, compared against their web twins, appended to the rubric doc.
- [ ] `_console__*.json` from the mobile run read, not just produced.
- [ ] Every defect in PART A closed, or deferred with a written reason.
- [ ] F1 (wrapped-tab underline) and F2 (Latin count on `/in/[handle]`) fixed,
      reproduced at 390px in `ar-PS` before and after.
- [ ] Each defect class in §2.2 has a check that fails if it regresses — and you
      have **broken each one on purpose** to confirm it fails.
- [ ] No interactive element in either kit below the token target minimum,
      proven by measurement.
- [ ] Design-sync: previews updated for every changed component, `rebuild.sh`
      clean, project pushed.
- [ ] Self-audit pass done, findings fixed or recorded.
- [ ] Forbidden-words grep over the full diff returns nothing.

**Gates — paste the exit code for each, from a clean `pnpm install --frozen-lockfile`**

```
lint · format:check · lint:tokens · qa:design · check:release-placeholders
check:security-headers · type-check · db:deploy · test · mobile test
build · mobile:recovery-check · playwright --workers=1
```

All must be `0`. The single permitted failure is `billing.spec.ts` — the
`BANK_TRANSFER_IBAN` credential — and you must prove it is the credential by
re-running that spec with a test IBAN set and showing it green, exactly as round
2 did. Any other failure is yours.

- [ ] `docs/audit/` updated with what changed, what regressed, and what you got
      wrong.

---

## Ship protocol — only after every box above is ticked

**Do not start this until you are 100% confident the gate is fully passed.** If
you are not certain, you are not done; go back. "Probably fine" is how eight P1s
shipped through green CI.

1. **Push and open the PR.**

   ```bash
   git push -u origin design/system-v2
   gh pr create --base main --head design/system-v2 --title "<conventional subject>" --body-file <file>
   ```

   The body states what changed, what you found in your own self-audit, what you
   deliberately deferred, and what you got wrong. Not a feature tour.

2. **Watch CI to completion. Do not walk away from a pending check.**

   ```bash
   until [ "$(gh pr checks <N> --repo osama-2000236/palnet 2>/dev/null | grep -c pending)" = "0" ]; do sleep 30; done
   gh pr checks <N> --repo osama-2000236/palnet
   ```

   Expect seven checks: `install`, `lint`, `type-check`, `test`, `build-web`,
   `e2e-web`, `lighthouse-web`.

3. **If any check fails, fix it and push again. Do not merge, and do not stop.**
   Round 2's `e2e-web` failed on a missing Linux snapshot baseline — CI runs
   Linux, local runs win32, and Playwright keys snapshots by platform. Pull the
   `-actual.png` from the run's artifact, **look at it before trusting it**, and
   commit it as the baseline. Repeat until green.

4. **Merge only when all seven are green**, squash, per repo convention:

   ```bash
   gh pr merge <N> --repo osama-2000236/palnet --squash --delete-branch \
     --subject "<subject> (#<N>)" --body "<summary>"
   ```

5. **Merging `main` triggers the Deploy workflow** (staging migrate on Neon →
   Render staging hook + Vercel preview, `.github/workflows/deploy.yml`). Watch
   both post-merge runs to completion and confirm green:

   ```bash
   gh run list --repo osama-2000236/palnet --branch main --limit 2
   ```

   A merge that breaks `main` is worth knowing about in the same session that
   caused it.

6. **Fast-forward the primary worktree** at `C:\LinkedIn` (`git merge --ff-only
origin/main`) — check `git status` is clean first; the owner keeps untracked
   files there.

**Hard stops — do not merge if any of these is true:** a check is failing or
still pending; you deferred a PART A defect without writing down why; a done-gate
box is unticked; your self-audit surfaced something you have not fixed or
recorded. In any of those cases, keep working. Report the blocker only if it is
genuinely outside your control — a missing credential, a service that is down —
and say precisely which one.

---

Do not ask questions. Make the judgement calls, record each in one line, and
continue. When you are wrong, say so plainly and correct it — round 1 was wrong
twice, round 2 was wrong three times including once about itself, and the record
of that is worth more than a document that pretends otherwise.
