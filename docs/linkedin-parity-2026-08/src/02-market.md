---

# 2. Market evidence — the facts, and what each one forces

Every figure in this section has a source in the appendix workbook (`market-facts.xlsx`), with the URL and the retrieval date. No product decision anywhere in this document rests on an unsourced number.

The purpose of this section is not to be interesting. It is to be **load-bearing**: each fact below is followed by the design constraint it imposes, and every workstream in §5–§18 traces back to at least one of them.

## 2.1 The population is mostly not in Palestine

| Fact | Value | Source |
| --- | --- | --- |
| Palestinians worldwide, end 2025 | 15.49 million | PCBS |
| Resident in the State of Palestine | 5.56 million | PCBS |
| In the 1948 territories | 1.86 million | PCBS |
| Diaspora | ~8.82 million (6.82m in Arab countries) | PCBS |
| Annual remittances | US$3.5–4 billion | Palestinian economic press / MAS |

**What this forces.** The diaspora is **1.6× the size of the home market** and carries almost all of its hard currency. A professional network that treats Palestine as the market and the diaspora as an afterthought has its economics upside down. Concretely:

- **DERIVED:** The paying user is disproportionately abroad. Pricing, currency and payment rails must be split by residence, not by nationality (§13).
- **DERIVED:** The diaspora's product need is *not* job-seeking. It is (a) hiring Palestinians remotely, (b) mentoring, (c) finding a lawyer/accountant/contractor back home, (d) staying professionally connected to the country. Four different surfaces, none of which is the feed.
- **DERIVED:** `Profile.country` currently defaults to `"PS"` with no diaspora modelling at all. §5 adds `Profile.residenceCountry`, `Profile.originGovernorate` and `Profile.diasporaVisibility`, because "Palestinian engineer in Berlin who wants to hire in Nablus" is a first-class user, not an edge case.

## 2.2 The labour market is applicant-heavy and employer-poor

| Fact | Value | Source |
| --- | --- | --- |
| West Bank unemployment, Q4 2025 | 27.5% | PCBS LFS Q4-2025 |
| West Bank unemployment, Q3 2025 | 28.5% | PCBS LFS Q3-2025 |
| Unemployed persons, West Bank, Q4 2025 | ~280,000 | PCBS |
| Employed persons, West Bank, Q4 2025 | ~736,000 | PCBS |
| Youth graduate unemployment (19–29, diploma+), Q1 2026 | 41.3% | PCBS LFS Q1-2026 |
| — males | 31.7% | PCBS |
| — females | 49.2% | PCBS |
| Male labour force participation, Q4 2025 | 71.5% | PCBS |
| Female labour force participation, Q4 2025 | 18.6% | PCBS |

**What this forces.** LinkedIn's consumer business model is *"pay us and you will get seen by more employers."* In a market where nearly half of female graduates are unemployed, that model is **extractive and it will not convert**. It sells hope to people who cannot afford it, and it degrades the product for everyone who does not pay.

- **DECIDED:** Baydar never sells applicant visibility. No "boost your application", no "featured profile", no paid ranking of a person in front of an employer. This is not a phase-1 deferral, it is a permanent product rule, and it is why `HANDOFF.md` gap #1 (two Karama rewards that debited points and granted nothing) was correctly closed by *withdrawal* rather than implementation. §12 makes it a lint-enforced rule: **no ranking function may take a payment, subscription, credit or Karama balance as an input.**
- **DERIVED:** Revenue therefore comes from the employer side, the diaspora, and institutions — never from the unemployed. §13 prices accordingly.
- **DERIVED:** With ~280,000 unemployed in the West Bank alone against a thin employer base, the scarce resource is the **employer's attention**, not the candidate's. Every hiring feature must be optimised for employer throughput: structured applications, ranked shortlists, one-tap rejection with a reason. `MATCHING.md` already argues exactly this; §10 builds it.
- **DERIVED:** The 49.2% female graduate unemployment rate against 18.6% female participation means the product's largest addressable untapped segment is educated women who are not currently in the labour force. §12 and §16 specify the safety, privacy and remote-work surfaces that determine whether they join. This is a market-size argument, not a diversity gesture.

## 2.3 Connectivity is the binding technical constraint

| Fact | Value | Source |
| --- | --- | --- |
| Palestinians without internet access, 2025 | 39% | TS2 / sector reporting |
| Gaza towers offline, 2025 | 64% | sector reporting |
| Gaza mobile data generation | **2G** | Operator reporting |
| West Bank 4G | Approved Jan 2026 (Jawwal + Ooredoo + Ericsson management agreements); rollout stated as up to six months | JPost / operator reporting |
| 5G spectrum available to Palestinian operators | **None** | Al-Shabaka / operator reporting |
| Active mobile subscriptions | ~4.4 million | Sector reporting |
| Jawwal subscribers | ~3.0 million | Operator |
| Ooredoo subscribers | ~1.5 million | Operator |
| Spectrum authority | Israel retains final authority over frequency allocation and equipment imports | Oslo Accords / Al-Shabaka |

**What this forces.** This is the single most consequential set of facts in the document, and it is the one an international product team would get wrong.

- **DERIVED:** A 2G connection delivers roughly 20–40 kbit/s of usable throughput. A LinkedIn feed page weighs several megabytes. **On a Gaza 2G connection, a LinkedIn-shaped feed never finishes loading.** §15 therefore specifies hard, tested response-size budgets: feed page ≤ 24 KB gzipped JSON for 10 posts, no image auto-load below an effective-connection-type of `3g`, and a text-only mode that is the *default* when `navigator.connection.effectiveType` is `slow-2g` or `2g`, or when the RN `NetInfo` `cellularGeneration` is `2g`.
- **DERIVED:** Offline is not a nicety. §15 specifies a durable outbox for the four actions a user cannot afford to lose — posting, sending a message, submitting a job application, and confirming a `WorkProof` — with idempotency keys so a replayed action cannot double-submit. `Message.clientMessageId` already establishes this pattern with a `@@unique([roomId, authorId, clientMessageId])`; §15 generalises it.
- **DERIVED:** SSE is the realtime transport and `CLAUDE.md` says it stays. On 2G, SSE reconnect storms are a real risk. §15 specifies the backoff schedule and the "degrade to polling at 120s" rule, extending the existing `packages/shared/src/sse-retry.ts`.
- **DERIVED:** No hosted video in phase 1 of Learning (§12). A 10-minute 480p lesson is ~50 MB; on 2G that is roughly five hours. Text and audio only, with audio capped at 32 kbit/s mono Opus.
- **DERIVED:** Because 39% have no internet at all, **SMS is a first-class delivery channel, not a fallback.** §18 specifies SMS for exactly four events (application status change, interview invitation, `WorkProof` confirmation request, security alert) and nothing else, because SMS costs money and annoys people.

## 2.4 Money does not move the way LinkedIn assumes

| Fact | Value | Source |
| --- | --- | --- |
| Jawwal Pay | First company to obtain a final PMA licence; licensed May 2020; founded Feb 2018 | Jawwal Pay / PMA |
| PalPay ("محفظتي" / Mahfazati) | PMA-licensed e-wallet; subsidiary of Bank of Palestine | PalPay / BoP |
| Both operate in Gaza | Yes — UNDP formalised partnerships with both for Gaza digital financial solutions | UNDP PAPP |
| Currency in circulation | ILS (de facto), JOD (West Bank commerce and property), USD (ICT, diaspora, NGOs) | PMA |
| Statutory minimum wage | 1,880 ILS/month · 85 ILS/day · 10.5 ILS/hour (CoM Resolution No. 4 of 2021, in force since 2022) | Palestinian Cabinet / ILO |
| Apple ID country list | **Palestine is not offered.** Gaza residents typically select Egypt, West Bank residents Jordan | Apple support community |

**What this forces.** Three hard consequences.

1. **DERIVED — the Apple problem.** If Palestine is not a selectable App Store storefront, a resident's Apple ID is registered to Jordan or Egypt, and any in-app purchase settles in JOD or EGP against a store the user does not live in. Combined with Apple's requirement that digital-goods purchases inside an app use IAP, this makes an in-app subscription for a Palestinian resident somewhere between hostile and impossible. **DECIDED:** all Baydar paid conversion happens on the web. The mobile app shows entitlement state and a "manage on the web" affordance with **no purchase link and no price** in the iOS build, which is what Apple's rules permit for a multiplatform service. The Android build may link out, because Google Play's external-offer rules are looser and Palestine is a supported Play country. §13 specifies the exact platform-conditional rendering and the `check:release-placeholders` gate entry that enforces it.

2. **DERIVED — pricing.** LinkedIn Premium Career is US$29.99/month. Against a statutory monthly minimum wage of 1,880 ILS (≈ US$505 at the rate used throughout this document), that is **5.9% of a minimum-wage monthly income** for one subscription. The equivalent burden on a US minimum wage would be roughly US$75/month. Any price ported unchanged from LinkedIn's card is not a price, it is a decline. §13 sets every Baydar price in ILS first, derived as a percentage of the statutory monthly minimum, and converts outward for diaspora payers — never the reverse.

3. **DERIVED — rails.** The enum members `JAWWALPAY`, `PALPAY`, `REFLECT` exist in `PaymentMethod`, the env keys exist in `env.ts:52–57`, and `wallets.ts:24–26` declares their labels — but **no adapter exists**. Today, a Palestinian resident's only real payment paths are bank transfer and Karama points. §13 builds the three adapters behind one `WalletProvider` interface plus a cash-at-agent flow, because a wallet is how someone without a card pays for anything online here.

## 2.5 There is a real, export-oriented professional economy

| Fact | Value | Source |
| --- | --- | --- |
| ICT companies | 500+ | PITA |
| ICT employees | ~13,500 | PITA |
| Freelancers | 10,000+ | PITA |
| ICT share of GDP | 5–7% | PITA |
| ICT annual value added | > US$500 million | PITA |
| Exports as share of IT/BPS activity | 56% | PITA |
| ICT service exports, 2024 | ~US$91 million | World Bank |
| PITA members prioritising AI integration | > 25% | PITA |

**What this forces.**

- **DERIVED:** 10,000+ freelancers with a 56%-export industry is the single highest-value vertical on the platform and the one segment that already earns hard currency. §11 (services) is therefore not a "nice to have later" — it is the workstream with the shortest path to revenue and to diaspora engagement.
- **DERIVED:** `project-spec.md` explicitly excludes marketplace mechanics — ordering, carts, delivery tracking, in-app payment for work, escrow. §11 respects that boundary exactly: **listings, structured inquiries and evidence, no money movement between members.** Baydar is where the deal is found and the evidence lives; it is not where the deal is settled. This is stated as a permanent rule, not a phasing decision, so nobody re-litigates it in a later sprint.

## 2.6 Credentialing already has statutory owners

Verified in `docs/design/OCCUPATIONS.md` §1b against the bodies' own sites:

| Body | Site | Authority |
| --- | --- | --- |
| مجلس مهنة تدقيق الحسابات | `bopa.ps` | Created under art. 3 of قانون مزاولة مهنة تدقيق الحسابات رقم (9) لسنة 2004; its لجنة الترخيص issues the practice licence |
| جمعية مدققي الحسابات القانونيين الفلسطينية (PACPA) | `pacpa.ps` | 350+ members, split مزاولين / غير مزاولين |
| نقابة المحامين الفلسطينيين | `pbaps.ps` | Portal serves المحامين المزاولين والمتدربين |
| نقابة المهندسين | `paleng.org` | Engineering practice |

**What this forces.** LinkedIn's answer to credibility is a self-reported "Licenses & certifications" list that nobody checks, plus a verification badge tied to a government ID vendor. Neither maps here.

- **DECIDED (already, in OCCUPATIONS.md, and reaffirmed):** Baydar verifies a `Licence` against a body; it never invents a rank beside a نقابة. The professions' own vocabulary — **متدرّب → مزاول → غير مزاول** — is the model, and it is already in the schema as `PracticeStatus`.
- **DERIVED:** The occupational vocabulary was verified against التصنيف الأردني المعياري للمهن 2021 (2,993 occupations, ISCO-aligned, the reference the Palestinian NQF committee works from) with occurrence counts. **أسطى: 0 occurrences. صنايعي: 0. فني أول: 0. معلّم: 52, every one a teaching title. فني: 234 official titles.** This is a higher standard of evidence than most products apply to their taxonomy and §5 does not weaken it.

## 2.7 Movement is constrained, so "location" is not a string

Checkpoints, permit regimes and the separation of Gaza from the West Bank mean that a job's location is not a preference — it is a feasibility test. The repo already knows this: `proximityScore` in `palestine.ts` exists for exactly this reason, and `regionOfGovernorate` separates West Bank from Gaza.

- **DERIVED:** Every job surface must expose commute feasibility, not just a city name. §10 adds `Job.commuteNote` and a `reachability` band computed from `proximityScore` — **same governorate / adjacent governorate / same region / cross-region / requires permit** — rendered on the job card and used as a match input.
- **DERIVED:** `JobLocationMode.REMOTE` is disproportionately valuable here and must be a first-class filter with its own entry point, not a checkbox buried in filters. Remote work is how a Gaza graduate reaches a Ramallah or diaspora employer at all.

## 2.8 Trust is the product's actual moat

The repo's `ReportReason` enum already names the three local fraud patterns. That is the correct instinct, and it needs an engine behind it.

- **DERIVED:** In a market with 280,000 unemployed people, the advance-fee job scam is not spam — it is the single behaviour most likely to make the platform worthless. §16 specifies: employer verification required before a job is visible to anyone but its author, an outbound-message scanner for fee-request patterns in Arabic and English, a permanent unremovable "Baydar never asks you to pay for a job" banner on every job detail and every first message from an unverified employer, and a one-tap report that pre-fills `FEE_REQUEST` from the message it was invoked on.
- **DERIVED:** Women's safety determines whether the 18.6%-participation half of the market joins at all. §16 specifies a privacy posture (§16.4) that is stricter by default than LinkedIn's: photo optional with a dignified non-photo avatar, granular "who can message me", and message-request quarantine for non-connections.

## 2.9 Summary — the eight forcing facts

Everything in §5–§18 traces to one of these:

1. The diaspora is bigger and richer than the home market. → §5, §13, §11
2. Applicants vastly outnumber openings. → §10, §12, §17
3. Half of female graduates are unemployed and 81% of women are outside the labour force. → §12, §16
4. Gaza is on 2G and 39% of people have no internet. → §15, everything's payload budget
5. Apple has no Palestine storefront and cards are rare; wallets are licensed and real. → §13
6. LinkedIn's prices are 5.9% of a minimum monthly wage. → §13
7. Statutory bodies already own credentialing. → §5
8. The advance-fee job scam is the existential threat. → §16
