# Optimization plan

Written 2026-08-27. There was no such document before this one — perf material was
scattered across four places that never referenced each other:
[`perf-baseline-2026-07-14-local.md`](perf-baseline-2026-07-14-local.md) (one measurement),
[`deployment.md`](deployment.md) §6 step 6 (a pre-flight step never run),
[`PONYTAIL-DEBT.md`](../PONYTAIL-DEBT.md) (ceilings with upgrade paths), and
[`FEED-RANKING.md`](design/FEED-RANKING.md) §"the metric we refuse to optimise".

Every number below was measured in this worktree on 2026-08-27, not estimated. The commands
are in the appendix so any claim can be re-run and falsified.

---

## 0. The measurement problem — read this before doing any of the work

**Nothing on the API side is currently measurable, and that is the first thing to fix.**

The only recorded baseline (`perf-baseline-2026-07-14-local.md`: p95 ~228 ms, p99 ~233 ms)
was taken on a Windows dev machine, against `nest start --watch` — a **dev build** — with
**`REDIS_URL` unset**. The doc says so itself and warns against comparing staging to it.
Three of the fixes below are caching changes; against a no-Redis dev build they measure
nothing.

Staging is blocked: `docs/HANDOFF.md:199` lists "Staging perf baseline" as owner-gated,
because the staging hostname exists only inside the `RENDER_STAGING_DEPLOY_HOOK` secret.

**The web half has the opposite problem** — see §2.0. Web perf _is_ gated in CI, with hard LCP
and TBT budgets, but the gate is pointed at the landing page and two auth forms. The instrument
exists and is aimed away from the weight. That is cheaper to fix than the API's, and it is item
1 in §5.

**Consequence for sequencing.** The web and mobile work (§2, §3) is measurable locally today
and should go first. The API work (§1) is real and the reasoning holds without a profiler —
a removed round-trip is a removed round-trip — but do not claim a percentage until someone
reruns `pnpm load:api:baseline` against a prod-mode API with Redis up.

**Cheapest unblock, and it needs no owner:** rerun the existing artillery profile against a
local **production** build with Redis running. That is not staging, but it is the first
number in this repo that is not from a watch-mode dev server. Do that before §1.

---

## 1. API

Ordered by measured leverage, not effort.

### 1.1 `getBlockSet` — an uncached DB round-trip on 13 read paths ⭐ top item

`apps/api/src/modules/safety/safety.service.ts:151`. Every authenticated read that can show
another person calls `getBlockedEitherIds(viewerId)` first, and it hits Postgres every time:

```
comments.service.ts:157       feed.service.ts:25         posts.service.ts:78
connections.service.ts:307    messaging.service.ts:171   search.service.ts:83
connections.service.ts:378    messaging.service.ts:226   search.service.ts:189
notifications.service.ts:185  messaging.service.ts:285
notifications.service.ts:218
```

Thirteen call sites. Feed, search, every message list, and the notifications poll each pay
one extra serial round-trip before their real query can start — the block set is an input to
the main query's `notIn`, so it cannot be parallelised away.

This is **not** in `PONYTAIL-DEBT.md`. It carries no `ponytail:` marker, so nothing was
tracking it.

- **Not an index problem.** `BlockedUser` has `@@unique([blockerId, blockedId])` plus
  `@@index([blockedId])`, so the `OR` resolves as two index scans. The cost is the round-trip
  and the per-request latency floor it adds, not the scan.
- **Fix (lazy):** cache the set in Redis keyed on `viewerId`, invalidated by the two writes
  that can change it (block, unblock). Redis is already wired — `redis.clients.ts`,
  `fanout.ts`, `redis-throttler.storage.ts` — so this adds no dependency. There is currently
  **zero** application-level caching in the API (`grep CacheModule|cacheManager` → 0 hits);
  this is the first and best candidate.
- **Correctness constraint, do not skip:** a stale block set means a blocked person's content
  renders. Invalidate on write; do not rely on TTL expiry alone. A short TTL is the backstop,
  not the mechanism.
- **Ceiling to write into the code:** `getBlockedEitherIds` returns an unbounded array that
  goes into a `notIn`. A user with thousands of blocks builds a very large IN list. Not a
  problem at beta scale — but mark it with a `ponytail:` comment naming the switch to an
  anti-join, so it does not go untracked twice.

### 1.2 `job-alerts.service.ts:89` — unbounded table scan per published job

Already marked. `notifyMatches()` runs
`prisma.jobAlert.findMany({ where: { userId: { not: … } } })` with **no `take`** — the entire
alert table into memory, per job creation, then matches in JS.

The marker's stated trigger is "when alerts reach thousands". Two things it does not say:

- The load is **memory**, not just CPU — every alert row for every user, materialised at once.
- It is fire-and-forget from job creation, so it does not slow the employer's request. It
  degrades the API process for everyone else instead, which is harder to notice.

**Fix:** move matching into SQL. The alert columns (`city`, `type`, `locationMode`,
`industry`, keyword) are all filterable server-side; only the folded keyword match needs care,
and §1.3's index covers the same folding.

**Trigger to actually watch:** not "thousands of alerts" — it is alert-table row count times
job-creation rate. Surface the row count somewhere before this ships.

### 1.3 `jobs.service.ts:65` — folded `LIKE` prefilter, sequential scan

Already marked, upgrade path already named (folded FTS GIN index). Nothing to redesign; this
is a migration for when the jobs table gets big. Lower priority than 1.1/1.2 because the jobs
list is a smaller share of traffic than feed and messaging.

It pairs with 1.2 — the same folded index serves both. Do them in one PR.

### 1.4 Verified as already optimal — do not "fix" these

- **`feed.service.ts` is done.** One query for the whole feed (viewer OR accepted-connection
  authors, blocked excluded, soft-deleted authors excluded), backed by
  `Post(authorId, deletedAt, createdAt)`, plus one grouped `attachReactionBreakdown` for the
  page. No N+1. The in-file comment records that it replaced four round-trips. Leave it.
- **Indexes are not the bottleneck.** 81 `@@index` entries. `Job` carries
  `(isActive, createdAt)`, `(occupationKey, isActive)`, `(type, isActive)`; `Notification`
  carries five, including the `(recipientId, dedupeKey, readAt, dismissedAt)` the dedupe path
  needs. Do not open a speculative indexing PR.
- **`search.service.ts` raw SQL is bounded** — `LIMIT ${limit + 1}` on all four queries
  (profiles, posts, companies, jobs).
- **`account.service.ts:102-117` is the GDPR export.** Nine unbounded `findMany` calls, and
  unbounded is the correct semantics for "all of your data". Rare, authenticated, per-user.
  Not a defect.

---

## 2. Web bundle

Measured from a real production build in this worktree (`pnpm --filter @baydar/web build`,
exit 0). Total client chunks: **2.3 MB raw on disk, ~578 KB gzip**.

Two chunks are a third of everything:

| chunk              | raw    | gzip   | contents                  |
| ------------------ | ------ | ------ | ------------------------- |
| `2nofk0j9mhdz7.js` | 448 KB | 139 KB | Sentry                    |
| `0hbsb23z_mc0t.js` | 328 KB | 76 KB  | Zod (485 identifier hits) |
| `30nwbsp4mk5e9.js` | 140 KB | 37 KB  | —                         |
| `0cz1d0mv5g_q7.js` | 112 KB | 38 KB  | —                         |

### 2.0 There is already a Lighthouse gate, and it points at the four lightest pages

Unlike the API, web perf is gated in CI today — `lighthouse-web` in
`.github/workflows/ci.yml:189`, running `@lhci/cli` twice, desktop
(`apps/web/lighthouserc.json`, 3 runs) and mobile (`lighthouserc.mobile.json`, iPhone 390×844
emulation). Both assert **hard error budgets**: LCP ≤ 2500 ms, TBT ≤ 200 ms, CLS ≤ 0.1,
accessibility ≥ 0.95. Performance score ≥ 0.85 is a warn, not an error.

So the instrument exists. The problem is where it is pointed:

```
http://localhost:3000/ar-PS          http://localhost:3000/ar-PS/login
http://localhost:3000/en             http://localhost:3000/ar-PS/register
```

**All four are public and unauthenticated.** The landing page and two auth forms. Feed,
search, messages, jobs, the composer, `/moderation`, `/billing`, the CV renderer — every
surface where 578 KB of client JS and a 66%-client-component tree actually cost something — is
measured by nothing. A TBT budget on a login form will not catch a heavy composer.

**This is the cheapest item in the whole plan and it should probably go first.** It needs no
new tooling, no dependency and no owner: point the existing LHCI config at an authenticated
route. The obstacle is that Lighthouse needs a session, so it wants either a seeded login step
or a public-but-representative route. `/j/[id]` — the public share page, already server-rendered
— is the honest middle ground if seeding a session proves fiddly, because it renders real
content rather than a form.

Until that happens, treat §2.1–§2.4 as unguarded: nothing in CI fails if a change makes the
feed heavier.

### 2.1 Sentry is the single largest thing shipped, and half of it is switched off ⭐

`apps/web/src/instrumentation-client.ts` sets `tracesSampleRate: 0` — performance tracing is
deliberately disabled — yet the tracing code ships anyway, because the guard is a **runtime**
`if (process.env.NEXT_PUBLIC_SENTRY_DSN)` around a **static** top-level
`import * as Sentry from "@sentry/nextjs"`. The bundle is included whether or not a DSN is
ever set.

**Fix (laziest that works):** set Sentry's documented tree-shaking define
`__SENTRY_TRACING__: false` in the bundler config. Tracing is already off at runtime, so this
is a build-time removal of dead weight with **no behaviour change** — the cleanest kind of
win. Error reporting, the reason Sentry is here, is untouched.

Verify by rebuilding and re-measuring that chunk. If the define does not land under
Turbopack, fall back to a dynamic `import()` of `Sentry.init` inside the DSN guard — but note
`onRouterTransitionStart` is a named export Next.js reads statically, so it must stay a static
export. Try the define first.

`__SENTRY_TRACING__` was verified against the installed package, not taken from documentation:
20 occurrences in `@sentry/core@10.65.0`'s build output, including `utils/hasSpansEnabled.js`,
which is the gate the tracing code sits behind.

### 2.2 Zod ships to the browser — earned, but sized

76 KB gzip. `packages/shared/src/api-client.ts:224` runs `schema.safeParse(body)` on every API
response, and the file's own comment explains why: an unparseable response becomes a typed
error the UI renders instead of a crash.

**Do not remove this.** It is validation at a trust boundary and it is deliberate.

The only real lever is `zod/mini`, which is substantially smaller for the same schemas but has
a different authoring API — a rewrite of 19 schema files consumed by both platforms. That is
not a lazy change and it is not worth doing before §2.1 and §2.3, which are cheaper and
larger. Recorded here so it is a decision rather than an oversight.

### 2.3 Zero code splitting, and 66% of the app is client-side

- **`next/dynamic` appears 0 times** across 140 files in `apps/web/src`.
- **92 of 140 files carry `"use client"`** (66%).

So the only splitting is Next's automatic per-route split, and two thirds of the tree is
client-rendered. The highest-value targets are the heavy, rarely-first-paint surfaces — the
composer, admin `/moderation` and `/billing`, the CV renderer — none of which belong in the
first load of a feed visit.

**Fix:** `next/dynamic` on those, measured one at a time against the chunk table above. Do not
convert client components to server components wholesale as part of this; that is a
data-fetching redesign wearing a performance costume.

### 2.4 48 of 49 routes are server-rendered on demand

Only `/manifest.webmanifest` is static (`○`); everything else is `ƒ`. Correct for an authed
product, but `/legal/tos`, `/legal/privacy`, `/legal/community`, `/legal/employer`, `/login`
and `/register` have no per-viewer content.

Cheap, and **check first**: `middleware.ts` mints a per-request CSP `nonce`, which is why
inline scripts work in production. A statically prerendered page cannot carry a per-request
nonce. Confirm that interaction before prerendering anything, or this trades a small perf win
for a broken CSP.

---

## 3. Mobile

### 3.1 Every FlatList defeats its own cell memoization ⭐

All **13** `FlatList` call sites pass an **inline arrow** as `renderItem`:

```
app/(app)/feed.tsx:169                   app/(app)/notifications.tsx
app/(app)/jobs/index.tsx                 app/(app)/saved.tsx
app/(app)/messages/index.tsx             app/(app)/search.tsx
app/(app)/messages/new.tsx               app/(app)/network.tsx
app/(app)/employer/index.tsx             app/(app)/settings/blocked.tsx
app/(app)/employer/[slug]/index.tsx      src/screens/message-thread/MessageThreadList.tsx
app/(app)/employer/[slug]/[jobId].tsx
```

A new function identity every render invalidates `VirtualizedList`'s cell comparison, so every
visible row re-renders on any parent state change — and `feed.tsx` has six `useCallback`-wrapped
handlers whose whole point is to avoid exactly that.

Corroborating: `React.memo` / `memo(` appears **4 times** in the entire mobile app.

**Fix:** `useCallback` the `renderItem`, and `memo()` the row component. Two lines per list.
Start with `feed.tsx` and `MessageThreadList.tsx` — the two longest lists — and measure before
touching the other eleven. `settings/blocked.tsx`, `employer/index.tsx` and
`MessageThreadList.tsx` have **zero** `useCallback` at all, so their handlers churn too.

### 3.2 No list tuning anywhere

`windowSize`, `initialNumToRender`, `maxToRenderPerBatch`, `removeClippedSubviews` and
`getItemLayout` appear **zero** times across all 13 lists — every list runs RN defaults, which
are tuned for short lists, not a feed.

Do this **after** 3.1, and only where 3.1 was not enough. Guessing at these values without a
profile is how lists get worse. `getItemLayout` in particular is wrong to add for
variable-height rows, which PostCard is.

### 3.3 Not investigated — needs a device, not a plan

Cold start, Hermes bytecode size and the Metro bundle were not measured here. Note the
existing trap: `apps/mobile/e2e/shots.mjs:248` is logcat-only, and on RN 0.81 + Hermes JS
`console.*` never reaches logcat, so a scripted run produces empty capture files. Any startup
profiling needs the harness to own the Metro process first.

---

## 4. What this plan will not optimize

Stated once, so it is not re-litigated.

- **Session length.** `FEED-RANKING.md:188` names it as the metric the product refuses, and
  `BRAND.md` rules out infinite scroll optimised for it. Nothing here touches ranking to raise
  engagement.
- **`moderation/page.tsx:61`'s sequential bulk dismiss.** It looks like a missing
  `Promise.all`. It is deliberate: one request at a time is what keeps the 409 "another
  moderator got here first" path meaningful. The marker says so. Leave it.
- **`schema.prisma:1180`, sparse topic weights instead of embeddings.** The marker's ceiling
  is "ranks marginally worse, keeps the ability to say why a post was shown". Explainability
  is a product requirement, so this is not a perf trade to make.
- **`search.service.ts:336`'s `INNER JOIN Company`.** A correctness gate owned by occupations
  phase 4. It shows up in perf greps; it is not perf work.
- **Speculative indexing.** See §1.4.

---

## 5. Sequencing

One PR each, per `CLAUDE.md` commit discipline. Ordered so every step is measurable when it
lands.

Two of these are instrumentation, not optimization, and they come first on purpose: you cannot
defend a perf change you cannot measure, and both halves of the product are currently measured
in the wrong place — the API against a dev build, the web against its four lightest pages.

| #   | Work                                                                  | Measurable today?                             |
| --- | --------------------------------------------------------------------- | --------------------------------------------- |
| 1   | §2.0 point the existing LHCI config at an authenticated route         | **instrumentation** — unblocks all of §2      |
| 2   | §2.1 Sentry tree-shake define                                         | yes — rebuild, re-measure the chunk table     |
| 3   | §3.1 `useCallback` + `memo` on `feed.tsx` and `MessageThreadList.tsx` | yes — on emulator                             |
| 4   | §0 rerun artillery against a **prod-mode** API with Redis up          | **instrumentation** — first honest API number |
| 5   | §1.1 cache the block set in Redis                                     | only after 4                                  |
| 6   | §2.3 `next/dynamic` on composer / admin / CV                          | yes, and #1 makes it defensible               |
| 7   | §1.2 + §1.3 alert matching into SQL, folded FTS index                 | only after 4                                  |
| 8   | §3.1 remaining eleven lists, §3.2 tuning                              | after 3 shows the shape                       |

Items 5 and 7 stall on #4, which needs no owner — a local prod-mode API with Redis up. Nothing
here is blocked on the staging URL; §0's owner gate only blocks calling a number "staging".

**Gate before each handoff** (`CLAUDE.md`): format, lint, type-check, tests,
release-placeholder check, and the relevant Playwright/a11y checks.

---

## Appendix — how the numbers were produced

Run from the repo root. Every figure in this document comes from one of these.

```bash
pnpm --filter @baydar/db db:generate && pnpm --filter @baydar/web build
```

```bash
du -sh apps/web/.next/static/chunks
```

```bash
gzip -c apps/web/.next/static/chunks/2nofk0j9mhdz7.js | wc -c
```

```bash
grep -rn "next/dynamic" apps/web/src | wc -l
```

```bash
grep -rln "use client" apps/web/src | wc -l
```

```bash
grep -rn "getBlockedEitherIds" apps/api/src --include="*.ts" | grep -v spec
```

```bash
grep -rn "memo(" apps/mobile/src apps/mobile/app --include="*.tsx" | wc -l
```

Regenerate the debt ledger this plan cross-references:

```bash
grep -rnE '(#|//|--|/\*|\{/\*) ?ponytail:' . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs
```
