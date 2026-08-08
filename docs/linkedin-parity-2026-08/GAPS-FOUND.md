# Gaps found in the specification

Every place the specification failed to decide something, what was needed, which
section should have decided it, the options, and the choice made. The protocol
(`PROMPT.md` §7) is: stop, record, take the most conservative option — the one
that creates no migration to reverse and no user-visible commitment to withdraw
— and mark the site in code with `// GAP-FOUND: <id>`.

An empty file means the specification held.

---

## GAP-01 — the archived design tree still holds an open decision

**Phase:** P0
**Needed:** what to do with `design-handoff-2026-05/10-ask.md`, which
`DEPRECATIONS.json` schedules for archival at P0.
**Should have been decided by:** §19.1, which lists the tree as "superseded by
`design-handoff-2026-06/`" and treats it as purely historical.

**What the spec missed.** The tree is not purely historical. `AGENTS.md` and
`design-handoff-2026-06/README.md` both record `10-ask.md` as the **Pass 2 ask,
awaiting lead approval**, with the standing instruction that engineering does
not implement its output before that approval. Archiving a file does not answer
the question in it, and `docs/_archive/` reads as "closed" to every future
reader.

**Options:**

1. Archive as specified, and lift the open gate into the live docs.
2. Leave the tree where it is and mark the ledger entry as blocked on the lead.
3. Archive and say nothing — the tree is still readable.

**Chosen: 1.** It is the conservative one: nothing is deleted, the reasoning
moves with the tree, and the unresolved question stays where people look for
open work rather than where they look for history. `AGENTS.md` now states
explicitly that the ask is archived but not closed, and points at
`docs/HANDOFF.md` for its live status. Option 3 loses an open decision, which is
the one outcome that cannot be undone by a later edit.

**No code site** — this is a documentation decision, so there is no
`// GAP-FOUND: GAP-01` marker to find.

---

## GAP-02 — four of the permanent name bans cannot be enforced yet

**Phase:** P0
**Needed:** when `check-naming.mjs` starts enforcing the `permanentlyBanned`
entries `certification`, `gig`, `sponsored` and `community`.
**Should have been decided by:** §19.7 and `DEPRECATIONS.json`'s
`permanentlyBanned` block, which say the gate enforces them without saying from
which phase.

**What the spec missed.** Each of those four bans exists to protect a name that
this build has not introduced yet: `Certificate` (P3), `ServiceListing` (P8),
`Promotion` (P10) and `Group` (P7). Enforcing them at P0 fails the build on
correct code — `community` alone appears in the shipped `/legal/community`
route, which is a real page with a real name.

**Options:**

1. Enforce all nine permanent bans at P0, and carve out every current use.
2. Enforce the three that are already meaningful (the Rule 1 names), and add
   each remaining ban in the phase that introduces the concept it protects.
3. Skip the permanent bans entirely and rely on review.

**Chosen: 2.** A ban is only enforceable once there is a canonical name to point
at; before that, its error message would read "use nothing instead". Option 1
means writing carve-outs for legitimate current code, which is how a gate
accumulates exceptions until it stops meaning anything. The three Rule 1 names
(`APPLICATION_BOOST`, `BOOST_APPLICATION`, `FEATURED_PROFILE`) are enforced from
P0, because their replacement is genuinely nothing.

**Sites:** `scripts/check-naming.mjs`.

---

## GAP-03 — the two payload optimisations do not pay for themselves

**Phase:** P1
**Needed:** whether to ship the `authors` map and `?fields=` selection, which
§15.2 names as required to reach the budgets.
**Should have been decided by:** §15.2, which states the budgets in gzipped
bytes and then justifies both changes with an uncompressed saving.

**What the spec missed.** The budget table is explicitly gzipped, and the
40% figure for the authors map is not. Both were built and then measured,
gzipped, on a ten-post fixture with real Arabic bodies:

| Distinct authors in the page | `authors` map | Author repeated | Difference |
| ---------------------------- | ------------- | --------------- | ---------- |
| 1                            | 1,870 B       | 1,910 B         | −2.1%      |
| 5                            | 1,953 B       | 1,969 B         | −0.8%      |
| 10                           | 2,039 B       | 2,020 B         | **+0.9%**  |

DEFLATE deduplicates a repeated JSON object about as well as a hand-built map
does. On a page where nobody repeats, the map costs slightly more than it
saves. The predicted 40% is real — on the uncompressed body, which is not what
crosses a 2G link.

The second finding is larger: **a ten-post feed page is ~2 KB gzipped against a
24 KB budget.** There is twelve times the headroom the workstream assumed.

**Options:**

1. Ship both as specified.
2. Ship neither, and gate the budget so the decision is revisited by
   measurement rather than by argument.
3. Ship the authors map only, on the grounds it was already written.

**Chosen: 2.** The map bought roughly one percent and charged a wire format, a
hydration step, and a new failure mode — a post whose author is missing from
the map — for it. Field selection with a server-side allowlist per resource is
a mechanism that must be maintained on every DTO change forever, and with 22 KB
of headroom there is nothing to select away. Option 3 is the worst of the
three: it keeps the cost of a decision after its benefit has been disproved.

What ships instead is the gate: `apps/api/src/modules/feed/payload-budget.spec.ts`
asserts the 24 KB budget and a 4 KB working ceiling, so the phases that add
fields to the post DTO find out immediately. **When that file goes red, build
field selection** — the measurement, not this document, is what should decide.

The other six endpoints in §15.2's table are recorded at the top of that spec
and are owed; each lands with the phase that reshapes its DTO.

**Sites:** `apps/api/src/modules/feed/payload-budget.spec.ts`.

---

## GAP-04 — the outbox tray has no key for what a row is

**Phase:** P1
**Needed:** how a failed row names the thing that failed.
**Should have been decided by:** `spec/i18n-keys.manifest.json`, which
enumerates 25 keys for the `connection` namespace including `outbox.title`,
`outbox.retry` and `outbox.discard`, but nothing for the four kinds.

**What the spec missed.** A row reading only «لم تُرسل» asks the member to
guess what they lost. The tray needs a word for each of `POST`, `MESSAGE`,
`APPLICATION` and `WORK_PROOF_CONFIRM`.

**Options:**

1. Reuse an existing namespace's nouns (`composer.title`, `messaging.title`…).
2. Add `connection.outbox.kinds.*`, four keys, alongside the manifest's set.
3. Show the raw enum member.

**Chosen: 2.** Option 1 borrows strings written for other surfaces and couples
this tray to their register — «إنشاء منشور» is a button, not a label for a row.
Option 3 shows a member the word `WORK_PROOF_CONFIRM`.

Three of the manifest's keys were **not** added: `outbox.sending`,
`outbox.failed` and `outbox.empty`. The tray shows failed rows and a count of
pending ones, and renders nothing at all when there is nothing to decide — so
those three would be dead keys, which `pnpm check:i18n` correctly refuses.

**Sites:** the `connection.outbox` block in all four catalogs.

---

## GAP-05 — mobile has no SQLite, and does not need one

**Phase:** P1
**Needed:** the mobile outbox's storage.
**Should have been decided by:** §15.4, which specifies `expo-sqlite`.

**What the spec missed.** `expo-sqlite` is not a dependency of this app, and
the thing being stored is a list of tens of small objects that is rewritten
whole on every change. There is nothing to query.

**Options:**

1. Add `expo-sqlite` as specified.
2. One JSON file via `expo-file-system`, which is already a dependency.
3. `expo-secure-store`, which the app already uses for preferences.

**Chosen: 2.** Option 1 adds a dependency, a schema and a migration path to
store one array — and `CLAUDE.md` says to check whether the monorepo already
solves it first. Option 3 is the wrong tool twice over: SecureStore is for
secrets, is size-limited, and a queue is neither.

The file goes in the document directory rather than the cache, because the
system reclaims the cache under storage pressure and a queue of unsent posts
must not be reclaimable. The write is not atomic — `File` has no rename — so a
kill mid-write loses the queue; a corrupted file reads as empty rather than
throwing into the composer, and the member can see and re-send. Add SQLite
when the queue needs to be queried rather than read.

**Sites:** `apps/mobile/src/lib/outbox-storage.ts`.

---

## GAP-06 — 256 KB parts do not exist on R2

**Phase:** P1
**Needed:** the part size for resumable uploads.
**Should have been decided by:** §15.6, which specifies "R2 multipart with
256 KB parts".

**What the spec missed.** R2 implements S3's multipart semantics, and S3
requires every part except the last to be at least 5 MiB. A
`CompleteMultipartUpload` built from 256 KB parts is rejected with
`EntityTooSmall` — the upload is not slow, it is impossible.

**Options:**

1. 5 MiB parts, the smallest R2 accepts.
2. Chunk to a Baydar endpoint that buffers and assembles, then writes one
   object to R2.
3. Keep the single PUT and accept that a drop costs the whole file.

**Chosen: 1.** It makes the case that actually hurts resumable — the 20 MB,
60-second video cap from §7 is four parts at 30 kbit/s, roughly ninety minutes,
and a drop now costs one part instead of all four. Option 2 is a real feature
with its own storage, its own cleanup and its own abuse surface, and it puts
every uploaded byte through the API server, which §15's whole premise avoids.
Option 3 is the status quo this phase exists to fix.

**What this does not fix, and should be said plainly.** A 2 MB photo is below
one part, so it stays a single PUT and a drop still costs all nine minutes of
it. That is the case §15.6's own example names. Fixing it needs option 2 and a
decision about running member bytes through the API — worth taking, but not
worth smuggling in under "resumable uploads".

`shouldUseMultipart()` is the switch: below one part the plain PUT wins,
because multipart costs three extra round trips on the very connection this
exists to help.

**Sites:** `packages/shared/src/schemas/media.ts` (`MULTIPART_PART_BYTES`),
`packages/shared/src/resumable-upload.ts`.

---

## GAP-07 — a service worker would have been half an implementation

**Phase:** P1
**Needed:** how offline reads are stored on web.
**Should have been decided by:** §15.5, which specifies "a service worker with
a stale-while-revalidate cache" on web and `expo-sqlite` on mobile.

**What the spec missed.** Those are two implementations of one idea, on a
workstream whose own rule is one implementation with two storage adapters — the
same rule the outbox two sections earlier is written to. A service worker
caches responses on web and does nothing for mobile, so mobile needs the
read-through cache anyway, and then the two platforms have different definitions
of what is cached, when it expires, and what the 40 MB ceiling counts.

**Options:**

1. Both as specified: a service worker on web, a separate cache on mobile.
2. One read-through cache in `@baydar/shared`, over the two storage adapters
   the outbox already has.
3. A service worker on web only, and no offline reads on mobile.

**Chosen: 2.** The eviction policy, the ceiling, the key set and the staleness
timestamp are then written once and asserted once. Option 3 abandons the
platform where most of this market reads.

**What this does not do, and should be said plainly.** A service worker also
caches the app shell, so web can cold-start with no network at all. This cache
holds data, not HTML and JavaScript — a member who opens baydar.ps offline from
a closed tab still gets nothing. Adding a shell cache later is additive and does
not change any of the above; it is deliberately not bundled in here, because a
service worker that caches JavaScript chunks is its own release-and-rollback
problem and belongs in a change that can be reverted on its own.

**Sites:** `packages/shared/src/offline-cache.ts`, and the
`createWeb…`/`createNative…` adapters beside each app's outbox storage.
