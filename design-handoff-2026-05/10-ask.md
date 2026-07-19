# Ask for Claude Design — Pass 2 (drafted 2026-07-02, Sprint 27)

> **Pass 1 is closed.** All three Pass 1 asks (empty-state system, surface hierarchy, onboarding flow) were delivered and implemented in code — see `08-problems.md` §Resolved. This is the Pass 2 ask.
>
> AI-proposed scope below. **Lead confirms or overrides before anything goes to Claude Design** (Sprint 27 gate). Picks based on leverage: revenue impact × never-reviewed surfaces × system-level reach.

## Pre-conditions

None launch-blocking. The Pass 1 preconditions (settings 404, raw i18n keys, raw 403, dev overlays) are all fixed. Current snapshots in `04-screens/` are stale for the new surfaces — capture fresh web snapshots for premium/saved/company before the pass if mocks should build on real state.

## In scope (this pass) — 3 items

### 1. Monetization surfaces — design review + polish (web + mobile)

**Problem:** `/me/premium` (plan comparison, checkout method picker: card redirect / bank-transfer IBAN / Karama points / wallets coming-soon), invoices + receipt upload, and karama-as-payment shipped engineering-first after the 2026-05-21 critique. Zero design review on the surfaces that make money. Trust cues, plan-comparison hierarchy, payment-state feedback (pending bank review, failed card, karama balance) all engineering-composed.

**Deliverable:**

- Critique scores (5 dimensions, ship gate ≥7) for premium, checkout, invoices — web + mobile.
- Mocks for the checkout method picker and bank-transfer pending/reviewed/rejected states, Arabic first.
- Token diff if trust/payment cues need new semantic roles.
- Component changes with web + native parity.

### 2. Operator UX — admin `/moderation` + `/billing` queues

**Problem:** Sprint 25 hardened correctness (conflict 409 states, audit trail, denied states, rejection-reason prompt) but composition is engineering-made: dense review rows, no design pass on scan-speed, action affordance, or error-recovery hierarchy. Solo operator today; queue efficiency is launch-ops critical.

**Deliverable:**

- Operator-flow walk of both queues (claim → act → conflict → refresh) with pain notes.
- Mocks for queue row, action confirmation, conflict/stale state — web only (admin is web-only).
- Rationale for row density vs. card layout at operator scale.

### 3. Motion vocabulary — document the existing system

> **Delivered by engineering 2026-07-19** — `docs/design/MOTION.md` ships the
> choreography contract plus the usage audit; the three violations found
> (`Button`/`Input`/`Switch` on untokenized `duration-150`) were fixed in the
> same change. Lead can strike this item from the pass or review the doc as
> part of it.

**Problem:** `tokens.motion` (fast 80ms / base 120ms / slow 240ms + stagger step/max) and `useStagger` exist in code, but there is no choreography contract: page enter, list stagger, optimistic feedback, toast timing. Risk: every new surface invents its own timing.

**Deliverable:**

- `docs/design/MOTION.md`: when each duration applies, stagger rules, reduced-motion policy, web/native parity notes.
- Audit of current usages vs. the contract; diff list of violations if any.

## Out of scope (future passes)

- Brand-polish review of the wheat logo mark (mark shipped; `BRAND.md` text fix is a dev chore, not a design ask).
- Moodboard captures + mobile simulator snapshots — still `[HUMAN]` lead tasks, tracked in `STATUS.md`.
- Richer admin/employer empty-state copy (watchlist item; blocked on final product messaging).

## Constraints (must respect)

- All hard rules from `00-README.md` / repo `CLAUDE.md`.
- Tokens only; propose new tokens, never inline values.
- Web + mobile parity for every component change (item 2 exempt: admin is web-only).
- Arabic-first; Arabic mocks first, English second.
- Five surface variants used intentionally; no nested cards.
- RTL-safe logical CSS only.
- Both themes: every mock must work in warm light AND warm dark.

## Deliverables expected back

For each in-scope item, under `design-out/{problem-slug}/`:

- `mock-{screen}-{platform}-{locale}.png` — Arabic first, English second, light + dark where relevant.
- `token-diff.md` — additions/changes to tokens.
- `component-changes.md` — prop/variant changes (web + native parity noted).
- `rationale.md` — ≤200 words.

## Acceptance criteria

- All deliverables present; mocks render against `06-fixtures/content.json` strings without clipping.
- Token diff applies cleanly; no untokenized inline values.
- Web + mobile twin shown for every component touched (except admin).
- No LinkedIn-derivative compositions.

## Review loop

Lead reviews → APPROVED | CHANGES_REQUESTED. Max 3 rounds. **Engineering does not implement anything from this pass before the lead approves (Sprint 27 → 28 gate).**
