---

# 4. The vocabulary amendment, and the fourteen workstreams

## 4.1 Amending the naming spine

`docs/design/OCCUPATIONS.md` §0 is law and `scripts/check-naming.mjs` enforces it. This plan introduces concepts the spine does not yet name, so the spine must be **amended in the same commit that first uses each new word** — never worked around.

**DECIDED — new spine rows.** Add these to `OCCUPATIONS.md` §0's table and to the allowed vocabulary in `scripts/check-naming.mjs`:

| Concept | Code | Arabic | Notes |
| --- | --- | --- | --- |
| Non-statutory training credential from a named issuer | `Certificate` | شهادة | Distinct from `Licence` (statutory) and from `Standing` (earned). Never rendered as رخصة or as معتمد. |
| Asymmetric subscription to someone's output | `Follow` | متابعة | Distinct from `Connection` (تواصل), which is mutual. |
| A written, attributed testimonial about working with someone | `Recommendation` | توصية | Distinct from `Vouch` (تزكية, sponsors onto the craft ladder) and from `endorsements` (تأييد, a skill counter). |
| A member-run community | `Group` | مجموعة | Never "community", never "network" — `network` already means the connections tab. |
| A scheduled gathering, online or in person | `Event` | فعالية | |
| A published offer of paid work by a member | `ServiceListing` | خدمة معروضة | Never "gig", never "product". |
| A structured request to a service provider | `Inquiry` | طلب خدمة | Never "order" — nothing is ordered on Baydar. |
| A unit of learning content | `Lesson` | درس | |
| An ordered set of lessons | `Path` | مسار تعلّم | Note: `Track` (مسار) is already taken by the occupation regime. `Path` must always carry تعلّم in Arabic copy to disambiguate. |
| Paid placement of existing content | `Promotion` | ترويج | Never "ad", never "sponsored" as a code identifier; `Promotion` is the model, `promoted` is the DTO flag. |
| A member's declared availability window | `Availability` | جاهزية | |
| A durable client-side queued action | `OutboxEntry` | — | Internal; no user-facing Arabic. |

**DECIDED — new bans**, added to the `check-naming.mjs` ledger:

`certification` · `gig` · `order` (as a code identifier in the services domain) · `ad` / `advert` / `sponsored` (as code identifiers) · `community` · `endorsement` used for anything other than `ProfileSkill.endorsements` · `boost` (as a member-facing concept — see §4.2) · `premium` applied to any ranking input · `verified` applied to a person who has only a `DECLARED` licence.

**Why `Certificate` is allowed while `certification` stays banned.** The original ban exists to stop a fourth synonym for *standing* entering the vocabulary. `certification` is the abstract noun that invites that drift ("his certification level"). `Certificate` is a concrete, countable object with an issuer, a number and an expiry date — it cannot be mistaken for a rank. The ledger entry must carry this reason, because a future reader will otherwise "fix" the apparent inconsistency.

## 4.2 The two permanent product rules

These are not phasing decisions. They are constraints that this document asserts and that later work may not quietly relax. Both are enforced mechanically.

### Rule 1 — Money may never buy rank

**DECIDED:** No ranking, ordering, scoring or filtering function in Baydar may take as an input: a subscription status, a plan code, an invoice, an employer credit, a Karama balance, or any field derived from them.

*Enforcement.* A new gate, `scripts/check-ranking-purity.mjs`, added to the lint job. It parses every file matching `**/{feed,search,jobs,matching,ranking}*.service.ts` plus `packages/shared/src/ranking/**`, and fails if any of these identifiers appears in the same file: `Subscription`, `PlanCode`, `Invoice`, `EmployerCredit`, `karamaBalance`, `KaramaLedger`, `isPremium`, `promoted`. Promotions (§13.6) live in a **separate, visually distinct slot outside the ranked result set** and are assembled by `promotions.service.ts`, which the gate does not scan and which may not import a ranker.

*Why the gate rather than a code review rule.* `HANDOFF.md` records that this exact class of defect — Karama minting through a hire-status toggle, a double-charged checkout — survived multiple reviews and was caught by a targeted audit. A grep-level gate is cheap and it does not get tired.

### Rule 2 — Baydar never moves money between members

**DECIDED:** Members pay Baydar. Members never pay each other through Baydar. No escrow, no wallet-to-wallet, no invoicing between members, no delivery tracking, no cart. A bakery gets a profile and hires a baker; nobody orders bread through Baydar.

*Enforcement.* `Invoice.userId` and `Invoice.companyId` are payer references and there is no payee column; adding one requires an ADR. The `check-naming.mjs` ban on `order` in the services domain is the second half of this.

*Why it is permanent.* `project-spec.md` already excluded it. Restating it here matters because §11 (services) is exactly the workstream where somebody will propose adding it, and the reason to refuse is not scope — it is that money movement makes Baydar a financial institution under PMA supervision, which is a different company.

## 4.3 The fourteen workstreams

| WS | § | Name | Depends on | Phase |
| --- | --- | --- | --- | --- |
| WS-01 | §5 | Identity, evidence and the trust spine | — | 1, 3 |
| WS-02 | §6 | The graph: follow, degree, discovery | — | 2 |
| WS-03 | §7 | Content: mentions, polls, articles, newsletters, drafts | WS-02 | 4 |
| WS-04 | §8 | The ranked feed engine | WS-03 | 5 |
| WS-05 | §9 | Groups and events | WS-02 | 7 |
| WS-06 | §10 | Hiring end to end | WS-01 | 3, 6 |
| WS-07 | §11 | Services and the freelance economy | WS-01 | 8 |
| WS-08 | §12 | Learning | WS-01 | 9 |
| WS-09 | §13 | Payments, pricing and monetisation | — | 6, 10 |
| WS-10 | §14 | Messaging: groups, requests, voice, outreach | WS-02 | 4 |
| WS-11 | §15 | Low-bandwidth, offline and the Gaza path | — | 1 (cross-cutting) |
| WS-12 | §16 | Trust, safety and the scam economy | WS-06 | 2, 6 |
| WS-13 | §17 | Search and relevance | WS-01 | 5 |
| WS-14 | §18 | Notifications, digests and SMS | — | 7 |

Each of §5–§18 has the same eight subsections, in the same order, so the executor can work through them mechanically:

1. **What the market forces** — the §2 facts this workstream answers.
2. **Data** — Prisma models, enums, indexes, migration order.
3. **Contracts** — Zod schemas in `@baydar/shared`, DTO shapes.
4. **API** — routes, guards, rate-limit buckets, error envelopes, route-coverage-spec entries.
5. **Web** — routes, components, states.
6. **Mobile** — routes, components, parity notes.
7. **i18n** — namespace, key list, Arabic register notes.
8. **Tests and gates** — what must pass.
