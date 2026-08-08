---

# 20. Execution plan

## 20.1 The ordering principle

**FIX before ADD, everywhere it is possible.** §3.8 found 33 capabilities already committed in the schema, the enum set or the API with no engine or no UI — nearly a quarter of LinkedIn's surface. Finishing those is cheaper, lower-risk and more valuable than adding new ones, and several of the ADDs depend on them.

Three hard sequencing constraints from the scan, each of which will break something if violated:

1. **`search.service.ts`'s INNER JOIN must be fixed before the individual job composer ships.** `HANDOFF.md`: *"Do not ship phase 5 before this."* A company-less job that nobody can find is worse than no feature.
2. **`Post.publishedAt` must be backfilled and every query switched in the same phase.** A half-migration puts scheduled posts in the feed at composition time.
3. **WS-01's licence verification must precede WS-05's `BODY` group auto-approval**, or the auto-approval has nothing to read.

## 20.2 The eleven phases

Each phase leaves `main` green, passes every gate, and is useful to a real user on its own.

| Phase | Name | Contents | Exit criterion |
| --- | --- | --- | --- |
| **P0** | Ground truth | Fix the three stale docs (`DESIGN.md` §7.3 parity table, `project-spec.md` stack versions, `docs/design/PARITY.md`); delete dead i18n keys; add the three missing governorates and 54 cities; add university domains; add `scripts/check-ranking-purity.mjs` and `scripts/check-deprecations.mjs` to the lint job with empty ledgers | All seven existing gates plus the two new ones pass; `pnpm check:i18n` reports zero dead keys |
| **P1** | Low-bandwidth foundation (WS-11) | Connection-class detection, the three modes, payload budgets as a CI gate, field selection, the authors-map feed shape, the shared outbox with both storage adapters, idempotency records, resumable uploads, image variants | The payload-budget e2e spec passes at every listed endpoint; the 2G Playwright profile completes the three journeys |
| **P2** | The graph (WS-02) | `Follow`, `FollowerCount`, `FeedMute`, `RestrictedUser`, `SecondDegree`, the suggestion engine, degree and mutuals on every person DTO, the four network tabs on both platforms | `check-ranking-purity` passes on `discovery.service.ts`; `pnpm load:api:baseline` shows no `GET /feed` p95 regression |
| **P3** | Identity and evidence, part 1 (WS-01) | Verification (phone, work email, edu email), the profile sections, recommendations, career break, `addressGender`, skill canonicalisation, the server-rendered CV PDF and its mobile twin | Every WS-01 test in §5.9; `HANDOFF.md` gaps #5 and #6 closed |
| **P4** | Content and messaging (WS-03, WS-10) | Mentions, polls, articles, newsletters, drafts, scheduling, visibility, comment policy, `PostStats`; message requests, group rooms, voice, outreach, away messages | The one-parser/two-consumers markdown snapshot; the 24 KB feed budget still holds with a poll and an article in the page |
| **P5** | Feed engine and search (WS-04, WS-13) | Topic tagging, interest weights, the score, diversity, slates, cold start, explainability; `baydar_fold` SQL function, tsvector + trigram indexes, faceted search, saved searches, **the INNER JOIN fix** | The SQL/TS folding agreement on 200 strings; every slate entry has a reason; `EXPLAIN` shows GIN usage |
| **P6** | Hiring and safety (WS-06, WS-12) | Structured requirements, the match score both directions, screening questions, pipeline, notes, interviews, referrals, the document locker, employer verification, the scam scanner, ratings with the three anti-gaming rules, appeals, the team UI, the individual job composer, wage insight, the `payBasis` display fix at all four call sites plus mobile's new salary surface, the mobile `/j/[id]` route | The three fairness invariants; the never-pay banner asserted on every job surface; `HANDOFF.md` gaps #3, #4, #7 closed |
| **P7** | Groups, events, notifications (WS-05, WS-14) | Seeded groups, member groups, events, RSVP, the channel matrix, rollups, the weekly digest, SMS behind `SMS_PROVIDER` | The exhaustive channel-matrix test; the `joinUrl` leak test |
| **P8** | Services (WS-07) | Listings, structured inquiries, the inquiry→room→`WorkProof` loop, coverage chips | The no-payment-field schema test (Rule 2's enforcement) |
| **P9** | Learning (WS-08) | Paths, lessons, enrolment, progress, offline bundles, certificate issuance | The audio budget gate; certificate issued exactly once |
| **P10** | Monetisation (WS-09) | ILS-first catalog, the three wallet adapters, cash-at-agent, reconciliation, multi-currency with the JOD exponent, promotions outside the ranked list, the iOS purchase gate, institutional sponsorship | The JOD 3-decimal test; the plan-features regex test; `check-release-placeholders` fails a poisoned iOS fixture |
| **P11** | Redesign pass | Everything in `BAYDAR-DESIGN-REDESIGN-SPEC.docx` — the new surface variants, the `success`/`info` contrast fix, the component deltas, the screen recompositions | `pnpm qa:design`; `pnpm check:ui-lockstep` at 0; every new route in `apps/web/e2e/a11y.spec.ts` |

## 20.3 Per-phase definition of done

Adapted from `project-spec.md`'s existing list, extended for this scope. **All of it, every phase:**

1. Prisma migration committed in the same PR as the schema change.
2. Zod schema updated in `@baydar/shared` when any request or response shape changes.
3. Every new route added to **both** arrays in `api-route-coverage.spec.ts`.
4. API service and controller tests cover the happy path and every named failure path.
5. Web and mobile flows have Playwright, Jest or documented manual-smoke evidence proportional to risk.
6. i18n keys present in all four catalogs, **Arabic authored first**.
7. Every new `ui-web` component has its `ui-native` twin with identical prop and variant names, in the same commit.
8. `docs/HANDOFF.md` updated in place — rewritten, not appended.
9. `DEPRECATIONS.json` updated when anything is deprecated.
10. These commands pass, in this order:

```powershell
pnpm --filter @baydar/db db:generate
pnpm lint:tokens
pnpm check:tokens
pnpm format:check
pnpm lint
pnpm type-check
pnpm check:i18n
pnpm check:ui-lockstep
pnpm check:naming
pnpm check:native-versions
pnpm check:release-placeholders
pnpm check:security-headers
pnpm test:gates
pnpm test
pnpm qa:design
```

## 20.4 Commit discipline

`CLAUDE.md`: *"one component = one PR. Never bundle 'added Avatar + fixed auth + tweaked feed' in a single commit."*

For a change of this size that rule needs an operational reading. **DECIDED:**

- One commit per **coherent unit**: a model + its migration + its Zod contract + its service + its tests is one commit. A UI component pair (web + native twin) is one commit. A screen is one commit.
- Commit subject format: `<phase>/<ws>: <imperative>` — e.g. `P6/WS-06: add JobRequirement model and match scorer`.
- **Never** bundle a migration with an unrelated UI change. A migration commit that fails review is a migration you cannot cleanly revert.
- Every commit must leave `pnpm type-check` passing. A commit that does not build is not a checkpoint.

## 20.5 What "verified" means for this work

Three levels, and each phase states which it needs:

1. **Gate-verified** — the fifteen commands above pass. Necessary, never sufficient.
2. **Behaviour-verified** — a test asserts the *behaviour the spec describes*, not that the code runs. The distinction matters: `check:ui-lockstep` returning 0 proves the components pair, not that they render the same.
3. **Evidence-verified** — a screenshot, a captured payload, a measured timing. Required for: the 2G journeys (P1), the feed budget (P4), the RTL rendering of every new screen at 390px Arabic (P11), and the CV PDF's Arabic shaping (P3).

`HANDOFF.md` records that device evidence for the `Tabs` underline took ninety minutes of rediscovering three unrelated blockers, and that this is now one command: `pnpm --filter @baydar/mobile e2e:device-up`. **Use it.** Evidence-verified items that skip it will produce emulator artefacts that mislead.

---

# 21. Owner-input register

Everything that needs a credential, an account, a legal review or a human. **Build every code path fully, gate it behind its env var, ship the fallback.** Never stub the feature away.

## 21.1 Pre-existing (from `docs/HANDOFF.md`, verified 2026-07-25)

| Need                                                    | Blocks                          | Fallback while unset                     |
| ------------------------------------------------------- | ------------------------------- | ---------------------------------------- |
| `CORS_ORIGINS`, `BAYDAR_WEB_URL`, `INTERNAL_CRON_TOKEN` | Production boot                 | —                                        |
| `RESEND_API_KEY` + `MAIL_FROM`                          | Production boot, all email      | —                                        |
| HyperPay entity/token/webhook secret                    | Production boot, card payments  | Bank transfer + Karama                   |
| `BANK_TRANSFER_IBAN` + `_BENEFICIARY`                   | Production boot                 | —                                        |
| `CLAMAV_SCAN_URL`, `CLOUDFLARE_IMAGES_SCAN_URL`         | Production boot, media scanning | —                                        |
| `SENTRY_DSN` + `SENTRY_RELEASE`                         | Production boot                 | —                                        |
| Apple Team ID, Android SHA-256 fingerprints             | Deep links                      | Routes emit nothing useful               |
| EAS project id + signing credentials                    | Mobile release                  | —                                        |
| Both Render crons with `INTERNAL_CRON_TOKEN`            | Retention, Karama decay         | —                                        |
| Staging API hostname recorded in `docs/deployment.md`   | Pre-flight steps 6–7            | —                                        |
| Physical-device smoke evidence                          | Expo 54→57, release confidence  | Emulator evidence, which is not the same |
| Native-speaker Arabic review of 47 strings              | Copy quality                    | —                                        |
| Legal counsel review of `legal-copy.tsx` v0.1           | App-store review, real users    | —                                        |

## 21.2 New, created by this plan

| #   | Need                                                                                                                                                                         | Blocks                                                                         | Fallback while unset                                                                                                      | §             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | **SMS provider** — Jawwal/Ooredoo A2P, a regional aggregator, or Twilio. Choose one                                                                                          | Phone verification, the four SMS events, off-platform `WorkProof` confirmation | `LogSmsProvider` writes to Pino; phone verification is unavailable and the UI says so; off-platform `WorkProof` is hidden | §18.4, §5.4.2 |
| 2   | **Jawwal Pay merchant onboarding**                                                                                                                                           | The `JAWWALPAY` method                                                         | `isConfigured()` false, method hidden from the catalog — already a tested state                                           | §13.4         |
| 3   | **PalPay merchant onboarding**                                                                                                                                               | The `PALPAY` method                                                            | Same                                                                                                                      | §13.4         |
| 4   | **Reflect merchant onboarding**                                                                                                                                              | The `REFLECT` method                                                           | Same                                                                                                                      | §13.4         |
| 5   | **Professional-body data-sharing** with نقابة المهندسين / نقابة المحامين / PACPA / مجلس مهنة تدقيق الحسابات                                                                  | Automated licence verification                                                 | Manual moderator review — the code path is identical                                                                      | §5.4.2        |
| 6   | **Learning seed catalog authorship** — owner, partner (MoL TVET / PITA / a university), or contracted writers                                                                | A non-empty Learning tab                                                       | The feature ships empty with an honest empty state                                                                        | §12.1         |
| 7   | **Seeded-group volunteer moderators** — 16 governorate + 4 body + N alumni + M family groups                                                                                 | Group moderation quality                                                       | Groups ship read-mostly with platform moderation only                                                                     | §9.1          |
| 8   | **Craft family key confirmation** — `OCCUPATIONS.md` §6 item 5, still open. Keys are forever; Arabic labels are an i18n edit. _"Needs a tradesperson, not a search engine."_ | Standing labels                                                                | The current keys ship; a key change later is a data migration                                                             | §5.4.1        |
| 9   | **Registration-document review capacity** for employer verification                                                                                                          | Employer onboarding throughput                                                 | Verification queue grows; jobs stay invisible, which is the safe failure                                                  | §10.4         |
| 10  | **Legal review of the wage-insight publication** — publishing aggregate wage data has regulatory and reputational dimensions in any market                                   | `GET /insights/wages`                                                          | The endpoint ships behind a feature flag, default off                                                                     | §10.6         |
| 11  | **FX source** for `FX_FEED_URL` — PMA reference rates or a commercial feed                                                                                                   | Multi-currency accuracy                                                        | A single hardcoded rate table with a staleness warning in the UI                                                          | §13.5         |

**None of these blocks any phase.** Every one has a designed fallback that is honest to the user about what is unavailable and why. That is the difference between a gated feature and a stub.

---

# 22. Risk register

| #   | Risk                                                                                                 | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Scope collapse** — the plan is large enough that a partial execution leaves the product incoherent | High       | High   | The eleven phases are individually shippable and individually useful. Stopping after P6 yields a complete, safe hiring platform. Stopping after P3 yields a materially better professional network than today                                                                                             |
| 2   | **The 2G budgets are missed as features accumulate**                                                 | High       | High   | The budgets are a CI gate, not a guideline. A feature that breaks the budget fails the build                                                                                                                                                                                                              |
| 3   | **Rule 1 erodes** — a future sprint adds a "featured applicant" because it converts                  | Medium     | Severe | `check-ranking-purity.mjs`, the plan-features regex test, and the explicit statement in §4.2 and §13.2 that this was tried, withdrawn, and does not come back                                                                                                                                             |
| 4   | **Arabic register drifts** as ~2,400 keys per catalog are added by a non-native writer               | High       | Medium | Every new string in the register `docs/audit/ARABIC-REGISTER-2026-07-25.md` settled; MoL vocabulary preferred where ambiguous; the 47-string review list must not grow. **This risk is not fully mitigated by code and needs owner-input #12: a native-speaker pass over the new catalogs before launch** |
| 5   | **The scam scanner cries wolf** and gets ignored                                                     | Medium     | Severe | Precision on the 40 innocent near-misses is asserted _first_ in the test suite; graduated actions mean a match warns before it blocks; only family 1 hard-blocks, and only on job descriptions                                                                                                            |
| 6   | **JOD minor-unit bug** ships a 10× error                                                             | Medium     | Severe | `money.ts` owns the exponent table; an explicit 3-decimal test; every conversion routed through one function                                                                                                                                                                                              |
| 7   | **Employer verification throttles supply** — a thin employer base gets thinner behind a review queue | Medium     | High   | The individual-poster path needs no document and no human. Review SLA is 48 hours and is measured. If the queue exceeds 72 hours, the honest response is more reviewers, not a weaker gate                                                                                                                |
| 8   | **Feed ranking reduces reach for new members** and the cold-start path is where they live            | Medium     | High   | The 50/30/20 cold-start split; the `recent` sort as a permanent escape hatch; diversity constraints; finiteness means no member is buried under an infinite scroll                                                                                                                                        |
| 9   | **Apple rejects the iOS build** over the entitlement screen                                          | Medium     | High   | No price, no link, no CTA — the narrowest reading of the guidelines. `check-release-placeholders` enforces it. If rejected anyway, the fallback is removing the entitlement screen entirely, which costs nothing functional                                                                               |
| 10  | **A migration is irreversible on production Postgres**                                               | Low        | Severe | Two-release rule for every column removal; `DEPRECATIONS.json` and its gate; no migration bundled with unrelated changes                                                                                                                                                                                  |
| 11  | **Prisma 7 / Expo 57 pressure** during a long build                                                  | Medium     | Medium | Both are explicitly out of scope. §1.2 records why. Do not attempt them inside this work                                                                                                                                                                                                                  |
| 12  | **Gaza connectivity degrades further** and 2G becomes intermittent rather than slow                  | Medium     | High   | The outbox and offline reads are P1, before anything depends on them. The product degrades to a queue-and-sync client rather than failing                                                                                                                                                                 |
| 13  | **The wage-insight data is thin enough to identify employers**                                       | Medium     | High   | k = 7, widening bands, p25/p50/p75 rounded to 50 ILS, no joinable columns on the observation table, and owner-input #10's legal review before the flag is turned on                                                                                                                                       |
| 14  | **Two-sided ratings still fail** despite the three mitigations                                       | Medium     | Medium | Blind reveal, minimum count and the lifecycle window are the standard mitigations and they are all adopted. If they fail, the fallback is to show counts without scores — which is why `ratingAvg` is already nullable in `EvidenceSummary`                                                               |
