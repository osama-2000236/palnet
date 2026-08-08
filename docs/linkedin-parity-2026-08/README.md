# `docs/linkedin-parity-2026-08/`

**Baydar → a LinkedIn-class platform for the Palestinian market.**
Produced 8 August 2026 from a real scan of this repository at `main`, plus sourced market research.

This directory is the complete, gap-free specification for the build, plus the machine-readable contracts that go with it. It is designed so that an executor never has to guess.

---

## Start here

| Order | File | What it is |
| --- | --- | --- |
| 1 | **`PROMPT.md`** | The paste-ready execution prompt for Claude Code (Opus 5). Read this first if you are about to build. |
| 2 | **`BAYDAR-LINKEDIN-PARITY-MASTER-SPEC.docx`** | The plan. 22 sections, ~31,700 words, 45 tables. Front to back. |
| 3 | **`BAYDAR-DESIGN-REDESIGN-SPEC.docx`** | The web + mobile redesign: tokens, the sixth surface variant, 62 component pairs, screen recompositions, RTL and a11y. |
| 4 | **`market-facts.xlsx`** | Every figure used anywhere in the spec, with source, URL and the product decision it forces. Six sheets. |
| 5 | **`spec/`** | The machine-readable contracts. Read these instead of re-deriving them. |

`src/` holds the markdown the two `.docx` files were built from. Edit the markdown and rebuild; do not edit the `.docx` directly.

---

## `spec/` — read these instead of re-deriving them

| File | Contents |
| --- | --- |
| `schema.delta.prisma` | 41 new models, 17 new enums, 9 changed models, 4 changed enums — organised by phase, in migration order, with backfills and the invariants that apply to every block. |
| `contracts/critical-contracts.ts` | Every constant, threshold, weight and formula where a guess would break the design: money exponents, the evidence score, the standing ladder, the match scorer, the feed score, payload budgets, the outbox, the safety thresholds, the pricing table. |
| `FILE-MANIFEST.json` | 188 new API routes + 16 changed, each with guard, phase, public flag and note. Plus the 13 new rate-limit buckets. |
| `openapi-additions.yaml` | The same 188 operations as an OpenAPI 3.1 skeleton, for diffing what you built against what was specified. Not a source of truth — the decorators are. |
| `i18n-keys.manifest.json` | 22 new namespaces, 1,406 new keys per catalog, the 34 gendered strings, the 5 protected keys, the 4 banned values. |
| `design-tokens.delta.ts` | The complete token delta and nothing more — the semantic contrast repair, `evidence`, `promotion`, `connectionClass`, `measure`, three `z` insertions, `motion`, and the `promoted` surface variant. |
| `DEPRECATIONS.json` | The two-release removal ledger, the permanently-banned symbols, and the list of things a future audit will propose deleting and must not. |
| `palestine-governorates.delta.ts` | 16 governorates and 93 cities. The shipped table has 13 and 14. |
| `palestine-universities.delta.ts` | 22 institutions with email domains (required by `EDU_EMAIL` verification), plus `PS_ISSUERS` and `PS_CAUSE_KEYS`. |

---

## What the scan found

| | |
| --- | --- |
| Tracked files | 976 |
| Prisma schema | 1,240 lines · 44 models · 29 enums |
| Pinned API routes | 137 (17 public) |
| i18n keys | web 979 × 2 languages · mobile 867 × 2 |
| Bespoke CI gates | 7 |
| Design-system drift | **0** |

**The headline finding.** Of LinkedIn's 138 classified capabilities, **33 are already in this repo's schema, enum set or API with no engine or no UI** — nearly a quarter of the surface, sitting as committed intent with no behaviour behind it. Nine Prisma models have zero writers. `NotificationType.POST_MENTION` exists with no mention model. `TopicSource.HASHTAG` exists with no extractor. `Application.matchSnapshot` exists with no scorer. Three wallet payment methods exist as enum members and env keys with no adapter.

The fastest route to a LinkedIn-class product here is not to add features. It is to finish the ones the schema already promises, and only then extend. The phase order in §20 does exactly that: **FIX before ADD, everywhere it is possible.**

| Verdict | Count | Share |
| --- | --- | --- |
| HAVE — shipped and adequate | 26 | 19% |
| FIX — exists but defective or unreachable | 33 | 24% |
| ADD — does not exist | 51 | 37% |
| ADAPT — right capability, wrong shape for this market | 12 | 9% |
| REJECT — deliberately not built, with a written reason | 16 | 12% |

---

## The two permanent product rules

Neither is a phasing decision. Both are enforced mechanically by a new CI gate.

**Rule 1 — money may never buy rank.** No ranking, ordering, scoring or filtering function may take a subscription, plan, invoice, credit or Karama balance as an input. In a market where 41.3% of graduates are unemployed and half of those are women, selling applicant visibility is extractive and it will not convert. `HANDOFF.md` records that two such rewards existed, debited points and granted nothing; they were correctly withdrawn. They do not come back.

**Rule 2 — Baydar never moves money between members.** Members pay Baydar. No escrow, no wallet-to-wallet, no member invoicing, no cart. A bakery gets a profile and hires a baker; nobody orders bread through Baydar.

---

## The eight facts everything traces back to

1. The diaspora is **8.82 million** against **5.56 million** at home — 1.6× the market, and it carries the hard currency.
2. **~280,000 unemployed** in the West Bank alone; **41.3%** graduate unemployment. Applicants are abundant, employers are scarce.
3. **49.2%** female graduate unemployment against **18.6%** female participation. The largest untapped segment is an access problem, not a supply problem.
4. **Gaza is on 2G** and **39%** of Palestinians have no internet. At 30 kbit/s, every 24 KB costs 6.4 seconds.
5. **Apple has no Palestine storefront.** In-app purchase is not available to a resident. All conversion happens on the web.
6. **LinkedIn Premium Career is 5.9%** of a Palestinian statutory monthly minimum wage. Ported prices are declines.
7. **Statutory bodies already own credentialing** — Baydar verifies a licence; it never invents a rank beside a نقابة.
8. **The advance-fee job scam** is the existential threat, and the repo's `ReportReason` enum already names it.

---

## Build scale

| Artefact | Before | Added | After |
| --- | --- | --- | --- |
| Prisma models | 44 | 41 | 85 |
| Prisma enums | 29 | 17 | 46 |
| Pinned API routes | 137 | 188 | 325 |
| Public API routes | 17 | 12 | 29 |
| i18n keys per catalog | 979 | 1,406 | 2,385 |
| Design-system component pairs | — | 62 | — |
| Governorates | 13 | 3 | 16 |
| Cities | 14 | 79 | 93 |
| CI gates | 7 | 2 | 9 |

Phased into **eleven shippable increments** (§20). Each leaves `main` green and is useful to a real user alone. Stopping after P6 yields a complete, safe hiring platform; stopping after P3 yields a materially better professional network than today.

---

## Rebuilding the documents

```bash
cd docs/linkedin-parity-2026-08
cat src/00-*.md src/01-*.md src/02-*.md src/03-*.md src/04-*.md src/05-*.md \
    src/06-*.md src/07-*.md src/08-*.md src/09-*.md src/10-*.md src/11-*.md src/12-*.md \
  > /tmp/master.md
pandoc /tmp/master.md -o BAYDAR-LINKEDIN-PARITY-MASTER-SPEC.docx --toc --toc-depth=2
pandoc src/design-redesign.md -o BAYDAR-DESIGN-REDESIGN-SPEC.docx --toc --toc-depth=2
```

---

## Files the executor creates

These do not exist yet. `PROMPT.md` instructs the executor to create them, and they are deliverables even when empty.

- `GAPS-FOUND.md` — every place the specification failed to decide something. An empty file means the spec held.
- `BLOCKERS.md` — every gate that failed and could not be fixed inside its phase.
- `docs/adr/` — the architecture decision records written during phases with genuine trade-offs.
