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
