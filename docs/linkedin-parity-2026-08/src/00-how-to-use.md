# Baydar → LinkedIn-Class Platform for the Palestinian Market

## The complete, gap-free implementation specification

**Version:** 1.0 · **Date:** 8 August 2026 · **Target repo:** `osama-2000236/palnet` (`main`)
**Target executor:** Claude Code, Opus 5, single session
**Status of this document:** authoritative. Where it conflicts with an older sprint doc, this document wins for the scope it covers. Where it conflicts with `CLAUDE.md`'s hard borders, `CLAUDE.md` wins and this document is wrong — report it rather than deviating.

---

## 0. How to use this document

### 0.1 The no-guess rule

This specification exists because a guess is how a good plan becomes a bad codebase. Every place where an implementer would normally have to invent something — an enum member, a table name, a rejection copy string, a currency rounding rule, a migration order, an index — is **decided here, by name**.

Three markers appear throughout:

| Marker | Meaning | What the implementer does |
| --- | --- | --- |
| **DECIDED** | The decision is made and final for this scope. Rationale is given so it can be argued with later, not now. | Implement exactly as written. |
| **DERIVED** | The value follows mechanically from a fact in §2 (market evidence) or §1 (repo scan). | Implement as written; the derivation is shown so you can re-derive it if a fact changes. |
| **OWNER-INPUT** | Needs a credential, an account, a legal review, or a human that only the repo owner can supply. | Build the code path fully, gate it behind an env var, ship the fallback, and record it in the launch-blocker table. **Never** stub the feature away. |

There is no fourth marker. If you find yourself about to guess, you have found a defect in this document — stop, record it in `docs/linkedin-parity-2026-08/GAPS-FOUND.md`, and pick the most conservative option that does not create a migration you would have to reverse.

### 0.2 Read order

1. `CLAUDE.md` — hard borders. Law.
2. `project-spec.md` — locked stack.
3. `DESIGN.md`, `BRAND.md`, `docs/design/RTL.md`, `docs/design/MOBILE.md` — design authority.
4. `docs/design/OCCUPATIONS.md` §0 — the naming spine. **Amended by §4.1 of this document.**
5. `docs/design/FEED-RANKING.md`, `docs/design/MATCHING.md` — already-approved decision records this document implements rather than replaces.
6. `docs/HANDOFF.md` — live status and the six open gaps.
7. **This document**, front to back.
8. `docs/linkedin-parity-2026-08/BAYDAR-DESIGN-REDESIGN-SPEC.docx` — the web + mobile redesign.
9. `docs/linkedin-parity-2026-08/spec/*` — the machine-readable contracts. Read these instead of re-deriving them.

### 0.3 What this document is not

It is not a rewrite. The repo scanned in §1 is a mature, gated, well-argued codebase with 976 tracked files, a 1,240-line Prisma schema, 137 pinned API routes, five bespoke CI gates and a design system whose cross-platform drift ledger currently reads zero. **The correct posture is extension, not replacement.** Roughly 82% of the work specified here is additive; 14% modifies existing surfaces; 4% deletes. Nothing in §10 (deletions) removes a feature a user can currently reach.

It is also not a request to clone LinkedIn's interface. `CLAUDE.md` is explicit: *"Do not recreate LinkedIn's UI. Baydar is inspired by the category, not the product."* This document maps LinkedIn's **capability surface** — the jobs its features do for its users — and then specifies the Baydar answer to each, which is frequently a different shape because the market is different. Where LinkedIn's answer is right, we say so and copy the capability, not the pixels.

### 0.4 Structure

| Part | Contents |
| --- | --- |
| §1 | Verified baseline — what the repo actually contains, from a real scan |
| §2 | Market evidence — sourced Palestinian facts and what each one forces |
| §3 | LinkedIn's complete capability surface, 138 capabilities, each classified |
| §4 | The vocabulary amendment and the fourteen workstreams |
| §5–§18 | One section per workstream, each end-to-end: data → contract → API → web → mobile → i18n → tests → gates |
| §19 | Deletions and deprecations, with migrations and rollbacks |
| §20 | Execution plan, phase order, and the verification gates that define done |
| §21 | Owner-input register — every credential and human decision, in one table |
| §22 | Risk register |

### 0.5 A note on scale

Executed in full, this specification adds **41 Prisma models**, **17 enums**, **188 new API routes** (325 pinned in total, from 137 today) plus 16 changed ones, **58 shared Zod contract modules**, **62 new web routes and their mobile twins**, **62 design-system component pairs**, and **1,406 new i18n keys per catalog** (2,385 in total, from 979 today) across all four catalogs. Every one of those counts is computed in `market-facts.xlsx` → *Scale*, from the manifests in `spec/`, not estimated. That is not a single sitting for a human team. §20 phases it into eleven shippable increments, each of which leaves `main` green and each of which is useful to a real user on its own. The Opus 5 execution prompt (`PROMPT.md`) drives those phases in order and stops at the first failing gate.
