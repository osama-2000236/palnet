# PALJOBS-SPEC-INTAKE — what Baydar should take from the Shughol specification

Intake review of an external document: _"SHUGHOL / شغل — Full Product & Technical Specification"_,
v1.0, 7 August 2026 — a build-ready spec for an Arabic-first employment platform for the
Palestinian market (West Bank, Gaza, Jerusalem, diaspora-facing remote work).

Reviewed against `main` on 2026-08-07. Every "Baydar today" claim below cites a file. Every
figure is the source spec's, attributed to its source; the spec's own closing note says to
re-verify against PCBS, PMA and DataReportal before committing budget, and so does this.

## The structural fact, first

**It is not a spec to adopt. It is an evidence base to mine.**

Shughol and Baydar are different products aimed at the same market, and the spec says so
explicitly in two places that matter:

- §1.5 rejects **"a LinkedIn-style social feed / connections graph"** — "not the job to be done;
  adds moderation burden and bandwidth cost." That is Baydar's spine.
- §11.2 rejects **Next.js by name** ("hydration payload") in favour of Fastify with
  server-rendered templates, and caps JavaScript at 60 KB gzipped.

So the two documents disagree at the root, and Baydar's root is locked (`project-spec.md`,
"Locked Stack"). Everything below is filtered on one question: _does this survive Baydar's
locked decisions?_ The parts that do are worth a great deal, because the spec is doing something
Baydar's own docs have never done — **tracing each product requirement to a piece of market
evidence** (its §2.9 is a traceability table). That method transfers even where the features
don't.

---

## 1. Already converged — do not redo

Baydar reached several of the spec's conclusions independently, on different reasoning. Recorded
so nobody re-opens them as "gaps".

| Spec                                                           | Baydar equivalent                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| §7.1 deterministic, explainable matcher; ML deferred and gated | `docs/design/MATCHING.md` §1 "never a bare number", decomposed score               |
| §7.6 no numeric match %, no over-qualification penalty         | `MATCHING.md` §1; `project-spec.md` "no score may auto-reject"                     |
| §7.6 protected attributes never ranking inputs                 | `project-spec.md` occupation-platform non-negotiables                              |
| §5.6 `match_score_at_apply`; §7.7 versioned `ranking_config`   | `Application.matchSnapshot` — frozen score + weights version (`schema.prisma:850`) |
| Appendix B Arabic normalisation pipeline                       | `packages/shared/src/arabic-fold.ts` + the SQL `baydar_fold()` twin                |
| Appendix A.2 Palestinian trades granularity beyond ISCO        | `PS_OCCUPATIONS` / `PS_OCCUPATION_FAMILIES` in `occupations-data.ts`               |
| §5.4 `work_type` covering daily/piece-rate/seasonal work       | `JobType` +`DAY_LABOR`/`PIECE_WORK`/`SEASONAL`/`APPRENTICESHIP`; `PayBasis`        |
| §4.15 structured outcome capture, counterparty-confirmed       | `WorkProof` — one evidence primitive, counterparty moves it to CONFIRMED           |
| §1.5 no paid "featured applicant" / profile boost              | `BOOST_APPLICATION` and `FEATURED_PROFILE_7D` withdrawn (HANDOFF gap #1)           |
| §12.9 WCAG 2.1 AA, 44pt targets, RTL logical properties        | `CLAUDE.md` hard rules; `docs/design/RTL.md`; a11y ≥ 0.95 in Lighthouse CI         |

The `matchSnapshot` convergence is the notable one: both documents independently concluded that a
ranking decision must be reproducible after the weights change. Baydar shipped the column before
it shipped the engine.

---

## 2. Take these — ordered by damage prevented, not by effort

### 2.1 Minimum-wage validation against the statutory floor

**Spec:** §4.4.7, a locked rule. Statutory floor is **1,880 ILS monthly / 85 ILS daily / 10.5 ILS
hourly** (Council of Ministers Resolution No. 4 of 2021, effective 2022). A full-time monthly ILS
post below the floor gets an employer-facing modal, a `below_minimum_flag`, a public badge on the
post, and routing to review. Warn, not block — §4.4.7's stated reason is that blocking removes the
listing but not the job, and pushes the worker to a channel with less information. The spec logs
the counter-argument as an open decision (OPEN-09).

**Evidence behind it:** 14.5% of West Bank private-sector wage employees — roughly 37,000 people —
earned below the legal floor in Q1 2026, averaging 1,457 ILS (PCBS).

**Baydar today:** nothing. `grep` for `1880|minimumWage|minWage` across `apps` and `packages`
returns zero. `CreateJobBody` validates only that `salaryMax >= salaryMin`
(`packages/shared/src/schemas/job.ts:58`).

**Why it is the top item:** it is the cheapest Palestine-specific worker protection available, it
needs no new subsystem, and it lands exactly where phase 2 already owes work. HANDOFF records that
`payBasis` has copy and no display and that phase 2 owns both halves — the basis control on the
employer form and the four `formatSalaryRange` call sites. The floor check needs the same two
things: the basis and the currency. Build them together or build the basis twice.

**Cost:** one shared constant table (monthly/daily/hourly floors + effective date), one refinement
on `CreateJobBody`, one nullable flag on `Job`, one badge component pair, four i18n keys. The
`PayBasis` → floor mapping is the whole logic.

**Conflict:** none. Warn-vs-block is an owner decision; the spec argues warn and Baydar can adopt
either without changing the schema, which is the point of storing a flag rather than rejecting.

### 2.2 Rejection carries a reason, enforced server-side

**Spec:** §4.8.3, mandatory. A fixed enum — position filled · experience not sufficient ·
different skills needed · location/commute · qualification or licence missing · applied after
closing · other. The seeker sees it. Employers who reject without a reason after 7 days trigger an
auto-rejection with `Position filled` and a note that the employer did not respond. §15.3 targets
100% of rejections carrying a reason, at launch and at 18 months.

**Baydar today:** `ApplicationStatus.REJECTED` exists and carries nothing. `Application` has no
reason column (`schema.prisma:833-858`); `UpdateApplicationStatusBody` is a bare status
(`schemas/job.ts:167`).

**Why it matters here specifically:** roughly 40,000 graduates a year against about 8,000
graduate-level openings, and a 10–23 month wait for a first job (PCBS). The spec's persona P2 has
sent ~200 applications and received 4 replies. In a market at that ratio, silence is the dominant
complaint and the cheapest fixable one — and Baydar is already building "applicant intelligence"
in `MATCHING.md` §5 without closing the loop back to the applicant.

**Cost:** one enum, one nullable column, one required-when-REJECTED refinement, one line on the
application-history row. The auto-close-after-7-days half is a cron and can come later.

### 2.3 Fraud content classes that match this market's actual fraud

**Spec:** §8.6 defines 13 banned content classes. Four of them have no equivalent anywhere in
Baydar and describe the fraud that actually happens here:

| Class       | What it is                                                        |
| ----------- | ----------------------------------------------------------------- |
| `CC-FEE`    | any request for payment from a worker or applicant                |
| `CC-PERMIT` | work-permit sale, brokerage, "I can arrange a magnetic card"      |
| `CC-GHOST`  | a vacancy that does not exist — posted to harvest CVs and numbers |
| `CC-ID`     | requesting identity documents before a genuine offer              |

**Evidence:** reported permit-brokerage fees run 1,500–3,500 ILS per worker per month, with a
single intermediary documented handling 200 workers (Kav LaOved); ITUC put per-worker fees at
$591–$740 and broker profits at $119M in 2018. Advance-fee demands are the dominant regional job
scam.

**Baydar today:** `ReportReason` is the generic social-network set — `SPAM`, `HARASSMENT`, `HATE`,
`MISINFORMATION`, `NUDITY`, `VIOLENCE`, `OTHER` (`schema.prisma:180`). A user who is asked for
money has to file it under "OTHER", where it is indistinguishable from everything else and cannot
be counted, routed, or SLA'd.

**Take the cheap half now:**

- The report categories themselves — one enum, plus routing and an SLA per category (§8.7: 2 hours
  for harassment/child/trafficking, 6 hours for fee/permit, 48 for the rest).
- The **never-pay banner** (§4.9.1 BR-MSG-07): a persistent, non-dismissible line at the top of
  every new employer↔applicant thread — «لن يطلب منك صاحب العمل أي مبلغ مالي. أبلغ عن أي طلب
  دفع.» Two i18n keys and a component. It is the spec's one-line brand promise (§8.2) and it costs
  nothing.
- The **one-tap "this employer asked me for money" report** that bypasses the normal queue (§8.8).

**Defer the expensive half:** the §8.5 risk scorer (lexical + structural + behavioural + network
signals, ≤150 ms p95, recall ≥0.90 on an adversarial corpus). That is a real build with a real
false-positive budget, and it is worthless without moderator staffing to work the queue it fills.

### 2.4 Profile visibility defaults, and hiding from named employers

**Spec:** §5.3 makes `visibility` a first-class column with **`applied_only` as the default** —
public · employers_only · applied_only · hidden. §12.8 adds per-employer blocking, an explicit
"hide from specific employers" list, and photo as optional-and-never-prompted-twice. §7.3 applies
visibility as a hard filter in the seeker→employer direction.

**Evidence:** female labour-force participation in the West Bank is 17.5% against 70.1% male (PCBS
Q1 2026), and graduate unemployment runs 61% female against 34% male. The spec's argument is that
these settings are not preferences, they are whether half the market can use the product at all.
Its persona P4 is specific: worried her phone number reaches strangers, and that employers in her
extended social network see she is job-hunting.

**Baydar today:** `Profile` has **no visibility field of any kind** (`schema.prisma:388-422`).
What it does have is `openToWork` and `hiring` as public booleans — the exact "everyone can see I
am job-hunting" signal P4 is afraid of, with no control over who sees it. Blocking exists but is
user↔user only (`BlockBody.blockedUserId`, `schemas/moderation-safety.ts`); a company cannot be
blocked, and `Job.companyId` is now nullable, so a job can come from a person the seeker knows.

**What to take, in order:** the `visibility` column with a privacy-protective default; scoping
`openToWork` to that setting rather than to the public profile; blocking a company, not just a
user. The "hide from these named employers" list is the highest-value item and the most work —
it needs a searchable employer picker.

**Conflict:** genuine, and worth stating. Baydar is a _network_ — a profile nobody can see is a
worse network. `applied_only` is the right default for a job board and probably the wrong one for
Baydar. The take here is that **the axis must exist and `openToWork` must sit on it**, not that
Baydar should copy the default.

### 2.5 Employer verification is a ladder, not a boolean

**Spec:** §4.3.2, four tiers. T0 unverified (draft only, cannot publish) → T1 phone-verified (2
concurrent informal posts, posts carry a "limited verification" notice) → T2 business-verified
(**MoNE commercial registration number**, which is the same number as VAT and income tax, plus a
Chamber of Commerce membership number or an uploaded certificate, plus a callback; manual review,
1-business-day SLA) → T3 trusted (≥3 confirmed hires, zero upheld violations in 180 days, a signed
Fair Hiring Undertaking). Each tier grants capabilities. §4.3.4 is the important part:
verification happens **after** the first post, asynchronously — "front-loading verification kills
supply."

Also §4.3.5 BR-EMP-04: recruitment agencies must self-declare and **name the end employer on every
post**, or the post is rejected. That is a local pattern worth pre-empting.

**Baydar today:** `Company.verified` is one boolean with no evidence trail, no tier, no capability
mapping, and no reviewer identity (`schema.prisma:737`). `CompanyMember` RBAC exists with
OWNER/ADMIN/EDITOR guards and has zero UI (HANDOFF gap #4).

**What transfers cleanly:** the _evidence_ model, not the tier count. The MoNE registration number
is a genuinely strong local signal — one number serves as both VAT and income-tax registration, so
it is a single field that is hard to fake and easy to check — and the Chamber of Commerce is a
second independent signal because companies must register with it under the Chamber of Commerce
Law of 2011, Art. 9. Storing that number, uniqueness-checking it so one registration cannot back
two accounts, and recording who approved it and when, is most of the value.

Also take §4.3.3: verification documents encrypted with a separate key, visible only to a verifier
role, and **purged 90 days after the decision** — the decision and a hash are retained, the
document is not.

**Vocabulary conflict — read before naming anything.** `OCCUPATIONS.md` §0 reserves **موثّق for
identity verification and nothing else**, and bans `tier`, `level`, `badge` and `rank` as field
names, with `scripts/check-naming.mjs` failing CI on them. An employer-verification ladder needs
its own word, chosen against that spine, before a line of code.

### 2.6 The performance gate measures the wrong envelope

This is the most interesting finding, because Baydar _has_ the gate and it is not testing what it
appears to test.

**Spec:** §10.1 — usable on "a 2019-era Android phone with 2 GB RAM on a 2G connection with 40%
battery", with §10.2 budgets as CI-enforced build failures: ≤14 KB first HTML packet, ≤80 KB
critical path, ≤60 KB JS gzipped, LCP ≤2.5 s and TTI ≤5.0 s **on Slow 3G with 4× CPU throttle**,
and ≤150 KB of data for one search plus one application end to end.

**Evidence:** West Bank on 3G with 4G approved January 2026 and rollout stated at up to six
months; Gaza on **2G only**; Android at **86.42%** against iOS 13.58% (StatCounter, July 2026).

**Baydar today:** `apps/web/lighthouserc.mobile.json` asserts LCP ≤2500 ms, TBT ≤200 ms, CLS ≤0.1
and accessibility ≥0.95, and CI runs it (`.github/workflows/ci.yml:218`). Three problems:

1. **`"throttlingMethod": "provided"`** — Lighthouse applies no network or CPU throttling. The
   2500 ms LCP budget is measured against localhost on an unthrottled CI runner. It is a
   does-the-page-render check, not a connection-speed check. Nothing in the repo measures Slow 3G.
2. **The emulated device is an iPhone** — `emulatedUserAgent` is iPhone OS 17, `deviceScaleFactor`
   3, 390×844. On a market that is 86% Android, the mobile budget emulates the 14%.
3. **The URL list is four public pages** — landing, `/en`, login, register. The feed, search, job
   detail and the CV page — the heavy authenticated surfaces — are not measured at all.

**Take:** add throttling (`simulate` or `devtools` with a Slow-3G/4×-CPU preset), swap the
emulation to a mid-range Android profile, extend the URL list past the auth wall, and add a
**transfer-size** assertion, which is the budget that actually correlates with cost-per-page on a
metered prepaid line. Do not take the spec's absolute numbers — 60 KB of JS is a Fastify-plus-
Alpine budget and Next.js 16 with next-intl cannot meet it. Set Baydar's numbers from a measured
baseline (`docs/perf-baseline-2026-07-14-local.md` exists and nothing enforces it) and ratchet.

### 2.7 Message retention as a safety control, not a storage decision

**Spec:** §16.1 states the threat model plainly. No comprehensive Palestinian data-protection law
has been enacted and no independent supervisory body exists; the Cybercrime Decree-Law No. 16 of
2017 (as amended) lets the Public Prosecution and delegated judicial police reach private messages
and seize devices, and prosecution requests for citizen data numbered 26,000 in 2021 (7amleh).

The conclusion the spec draws: **"the safest data is data that does not exist."** Hence §16.5 —
messages retained **90 days**, profile voice intake 30 days, verification documents 90 days after
decision, analytics raw events 90 days then aggregated — and §4.9.1 BR-MSG-06 requires telling
users this in the UI. Plus §16.7: a published law-enforcement-request policy and a six-monthly
transparency report.

**Baydar today:** messages have no retention job. Two crons exist — account retention daily at
03:00 and Karama decay monthly (`render.yaml:53,69`) — and `AccountRetentionService` handles
deleted accounts only. Direct messages persist indefinitely.

**Take:** the _argument_, then the schedule. This is the one section of the spec most likely to be
new to the team, because it is not a feature — it is a reason to hold less. It also intersects an
existing launch blocker: HANDOFF lists legal/privacy counsel review as owner-supplied, with
`legal-copy.tsx` still v0.1 placeholder. The retention schedule and the law-enforcement policy
belong in that same review, not after it.

**Conflict:** 90 days is a job-board number. A professional network where colleagues keep threads
for years is a different product, and a 90-day cliff would be a real loss. But the current answer
— forever, by default, with nothing written down — is not a decision anybody made.

### 2.8 The outcome question, and what the North Star should be

**Spec:** §4.5.4 — at post expiry the employer gets exactly one notification: _"Did you find
someone?"_ → `Yes, hired from Shughol` / `Yes, elsewhere` / `No, repost`. That single question
feeds both the placement metric and the reputation signal. §15.2 then makes **confirmed placements
per month** the North Star, "chosen deliberately over applications or MAU because in a 5:1 market
application volume is trivially inflatable and measures desperation rather than value delivered."

**Baydar today:** `WorkProof` is already this primitive, and better — a counterparty confirms a
finished unit of work, and only `CONFIRMED` counts. But HANDOFF records that `WorkProof`,
`Standing`, `Vouch`, `Licence` and five more models "are created by the migration and read or
written by nothing." The model exists; the moment that creates it does not.

**Take:** the _trigger_. The spec's insight is that the confirmation moment is cheap if you attach
it to an event that already happens — a post expiring, an application reaching HIRED — and
expensive if you make it a separate thing a user must remember to do. Baydar has both events:
`Job.expiresAt` and `ApplicationStatus.HIRED`. Wiring `WorkProof` creation to those is the
smallest possible engine for the nine dormant models, and it produces the one metric worth
reporting.

---

## 3. Owner decisions, not backlog items

Four places where the spec takes a firm position that contradicts something Baydar has already
built. Each needs a written decision — either direction is defensible; leaving it undecided is not.

### 3.1 The zero-fee rule for job seekers

**Spec §9.1, restated as the immovable rule:** _"Job seekers never pay. Not for applying, not for
visibility, not for a CV, not for a certificate, not for 'premium'. There is no seeker-side SKU in
this business model, now or later."_ §1.5 lists charging job seekers as **PROHIBITED —
permanently**, with the reason: it is the exact mechanic of the dominant local job scam, so
adopting it makes the platform indistinguishable from the fraud it exists to displace. The closing
note predicts the rule "will look like money left on the table" and says it is not.

**Baydar today:** `USER_PREMIUM` — "Diaspora Premium User", $5/month, features `profileAnalytics`,
`whoViewedMe`, `diasporaBadge` (`packages/shared/src/schemas/billing.ts:57-64`) — and
`KaramaReward.PREMIUM_30D` at 500 points, which is the same grant bought with activity instead of
money.

**The honest read.** Baydar is a professional network, not a job board, and a paid tier on a
social product is not the same thing as charging for job access. `whoViewedMe` is a network
feature. The spec's rule is also aimed at a specific scam shape — pay-to-apply, pay-for-featured-
applicant, pay-for-CV-review — and Baydar has already withdrawn the two SKUs that were closest to
it (`BOOST_APPLICATION`, `FEATURED_PROFILE_7D`), though for an unrelated reason: they charged and
granted nothing.

**What to decide:** where the line is, in writing, before the ranking engine ships. The spec's
§9.10 acceptance criterion is a good forcing function — _"no seeker-facing paywall exists anywhere
in the codebase, enforced by a test that asserts no price field is reachable from a seeker-role
route."_ Baydar's version might be narrower: no paid product may affect **application visibility,
applicant ranking, or match position**. That rule permits `whoViewedMe` and permanently forbids
the two SKUs that were just removed, which is probably the intended shape — but it is not written
down anywhere, and PONYTAIL-DEBT and HANDOFF both show how fast a withdrawn feature comes back.

### 3.2 Phone-first identity

**Spec §4.1.2, locked:** phone is the primary identifier; email is optional everywhere and no flow
may be blocked by its absence; passwords are optional, with OTP as the default auth. §4.1.5 even
handles two brothers sharing one phone (up to 3 profiles per account) and operator number
recycling (24-month dormancy re-verification).

**Baydar today:** `RegisterBody` requires `email` and a 10-character password with upper, lower and
a digit (`packages/shared/src/schemas/auth.ts`). There is no phone field on the account at all.

**Why it is a strategic question and not a task:** it is an auth rewrite plus an SMS credential
plus a cost line. But Baydar's own `project-spec.md` already concedes the dependency — _"Off-platform
work confirmation needs phone OTP, so it needs an SMS credential. Every phase before that must be
useful on on-platform records alone."_ The spec's evidence would pull that forward: it is what
lets the informal segment register at all, and §4.10.2 shows SMS is also the fallback notification
channel for users on 2G. The decision is whether the SMS credential arrives once, for
`WorkProof` confirmation, or arrives as identity.

### 3.3 Payment rails and price points

**Spec §9.5 and Part 2.3, on evidence:** ~30% of eligible Palestinians hold a bank account and
~95% of transactions settle in cash (Jawwal Pay); **PayPal and Payoneer are closed** to West Bank
and Gaza (7amleh); Stripe is unavailable. The rails that exist are **JawwalPay** (PMA-licensed,
works without a bank account, covers Jerusalem ID holders), **PalPay/Mahfazati** (offline QR, large
agent network), **iBURAQ** (PMA-operated instant transfer, free, 24/7, ILS/JOD/USD/EUR) and cash
at agent. §9.3 prices job credits at ~20 ILS each and employer subscriptions at 250–600 ILS/month,
because 90% of the private sector is family MSMEs and the PA is in its worst financial year since 1994.

**Baydar today:** HyperPay (cards) plus bank transfer plus Karama points, with plans priced in
**USD** — Employer Basic $29/month, Employer Pro $99/month, Featured Slot $49
(`billing.ts:25-66`). HyperPay onboarding is an open launch blocker.

**What to decide:** whether the local rails are a phase-2 item or a launch item, and whether the
USD price points survive contact with a market where the spec puts an unlimited-posting employer
subscription at 250–600 ILS (roughly $65–160) for mid and large employers, and everything below
that on prepaid credits at 20 ILS. $99/month for Employer Pro is not obviously wrong for INGO and
diaspora buyers; it is very likely wrong for a nine-person aluminium workshop in Hebron, which is
the spec's E1 persona and 90% of the market by count.

### 3.4 Promoted placement must not reorder organic results

**Spec §4.6.4 and §9.7:** there is no "sponsored" sort position. Promoted posts appear only in
fixed, labelled slots — position 1 of the feed, position 6 of search — marked مُموّل, capped at 2
per page, never reordering organic results, and a T1 (phone-only-verified) employer may not
promote at all.

**Baydar today:** `FEATURED_SLOT` at $49 for 7 days exists in the plan catalog, and
`FEED-RANKING.md` is approved but the ranking engine is not built. HANDOFF is explicit that
`jobs.service.ts` orders by `createdAt` and `search.service.ts` by `updatedAt` — so no paid signal
touches ordering today, by accident rather than by rule.

**Decide it before the ranking engine ships**, because after it ships the boundary is a refactor
rather than a constraint. `project-spec.md` already says "ranking decides order, never volume, and
never outcome" — the missing clause is that **money decides neither**.

---

## 4. Do not take

| From the spec                                                           | Why not                                                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §11.2 Fastify + server-rendered templates + ≤60 KB JS; Next.js rejected | Baydar's stack is locked in `project-spec.md`. This is a rewrite, not an improvement, and the parity work with Expo mobile would not survive it                     |
| §1.5 rejecting the social feed and connections graph                    | That is Baydar's product. The spec rejects it for a job board with a moderation budget of 2 FTE                                                                     |
| §4.17.3 `lite.` subdomain, no-JS, ≤20 KB per page                       | A second front end to maintain in lockstep with two others. The transfer-size budget in §2.6 gets most of the benefit                                               |
| §4.17.4 SMS keyword + USSD channel                                      | Needs aggregator agreements with Jawwal and Ooredoo (the spec files this as its own OPEN-05). Whole product line                                                    |
| §4.14 M18 programme / cash-for-work roster                              | Beneficiary eligibility engines, rotation fairness, attendance, payment-file export. Bigger than any current Baydar module, and sells to a buyer Baydar has not met |
| §4.16 M20 contract generator + e-signature                              | Requires a Palestinian labour lawyer and an Electronic Transactions Law compliance review (the spec's own OPEN-11). Interesting later; not a backlog item now       |
| §9.6 the cash agent network                                             | Depends on §3.3 being decided first, and on a commercial agreement with PalPay or JawwalPay                                                                         |
| §4.11.6 no coordinate more precise than a locality centroid             | Already true — Baydar stores `city` as a string and has no coordinates. Nothing to do but not regress it                                                            |

The M18 and M20 rows are worth re-reading as _strategy_ rather than backlog: they are the two
places the spec identifies a funded buyer (donors running cash-for-work; the <25% of workers with
a written contract) that no incumbent serves. That is a business-model observation, and it is free
to keep in mind.

---

## 5. The evidence worth keeping regardless

The spec's most durable contribution is Part 2 — a sourced market baseline. These figures are
reusable for any Baydar decision, and none of them is in Baydar's docs today. Attributed as the
spec attributes them; re-verify before anything load-bearing depends on one.

- Unemployment 46% Palestine-wide in 2025, 28% West Bank against 78% Gaza; >650,000 unemployed;
  West Bank at 29.5% (~294,000) in Q1 2026. _(PCBS)_
- ~40,000 graduates a year against ~8,000 graduate-level openings; 10–23 months to a first job.
  **Roughly five graduates per graduate-level job.** _(PCBS)_
- Female LFP 17.5% against male 70.1% (West Bank, Q1 2026); graduate unemployment 61% female
  against 34% male. _(PCBS)_
- ~90% of the private sector is family-owned MSMEs; **<25% of employees hold a written contract**;
  5.1% of employed youth are in formal employment. _(Hilal 2013; Sadeq 2016; BTC 2017, via TVET@Asia)_
- Minimum wage 1,880 ILS monthly / 85 daily / 10.5 hourly; 14.5% of West Bank private-sector wage
  employees (~37,000) paid below it, averaging 1,457 ILS. _(Resolution No. 4 of 2021; PCBS Q1 2026)_
- ~30% banked, ~95% of transactions in cash; PayPal and Payoneer closed to WB/Gaza.
  _(Jawwal Pay; 7amleh)_
- Android 86.42% / iOS 13.58%. _(StatCounter, July 2026)_ West Bank 3G with 4G mid-rollout; Gaza 2G.
- Facebook reaches 3,334,300 people (53.1% of the population), and job groups — not Jobs.ps — are
  the real incumbent for informal work. _(NapoleonCat, April 2026)_
- Social Security Law No. 19 of 2016 is **suspended** — build no feature that assumes a
  private-sector scheme exists.
- No comprehensive data-protection law; Cybercrime Decree-Law permits compelled access to private
  messages; 26,000 prosecution requests for citizen data in 2021. _(7amleh)_

The last two are constraints on the schema, not context.

---

## 6. If only three things get done

1. **§2.1 minimum-wage validation** — smallest change, clearest worker protection, and it is
   already coupled to the `payBasis` work phase 2 owes.
2. **§2.2 rejection reasons** — one enum and one column against the loudest complaint in a 5:1
   market, on a surface Baydar is actively building.
3. **§2.6 fixing the perf gate's throttling and device emulation** — because a budget that does
   not measure the real envelope is worse than no budget: it reports green.

Then §3.1 and §3.4 as written decisions, because both get more expensive the moment the ranking
engine lands.

---

_Source document reviewed: `PalJobsFullSpecification.md` (Shughol/شغل v1.0, 7 August 2026), 2,352
lines, Parts 0–21 plus Appendices A–H. Its Part 21 reserves 14 decisions it deliberately does not
make; none of those 14 is a Baydar decision, but OPEN-09 (warn vs block on below-minimum posts) and
OPEN-07 (settlement listings policy) become Baydar's if §2.1 ships._
