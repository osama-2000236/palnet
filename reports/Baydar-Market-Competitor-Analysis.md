# Baydar — Market and Competitor Analysis

**Report date:** 13 November 2026 · **Evidence cut-off:** 13 November 2026 · **Release verdict (verification ledger): NO-GO**
**Basis:** only the files under `research_notes/` (market, trust/regulatory, competitor, verification, traceability, API/DB, mobile, shared-UI notes). Nothing else was consulted; no URL below is new. This is research, not legal advice, and not a release approval.

## 0. How to read this report

| Tag | Meaning |
|---|---|
| **[Ledger: confirmed]** / **[Ledger: partly]** / **[Ledger: not reproducible]** | Verdict from `high_severity_verification.md` (static source audit of the dirty worktree; no fresh runtime run). Controls where it conflicts with another note. |
| **[Unverified by ledger]** | Claim exists only in another audit note (API/DB, mobile M10–M12, shared UI, traceability). Not re-checked by the ledger; treat as a lead to revalidate. |
| **[PS evidence] / [Global evidence]** | Palestinian primary/local source / international standard or measurement. |
| **[Legal requirement] / [Platform requirement] / [Standard]** | Statute text / Apple-Google rule / best practice, as classified in the trust note. |
| **[Inference] / [Recommendation] / [Proposed]** | Interpretation / suggested decision / target with no measured basis yet. |

Competitor pages show observable functionality only, not adoption, quality or user preference. No dedicated web-application audit note exists under `research_notes/`; web statements rest on the traceability and shared-UI notes.

## 1. Executive decisions

| # | Decision | Recommendation | Evidence status |
|---|---|---|---|
| D1 | Release posture | **NO-GO** for any release claiming production payments, robust session rotation, completed M1–M9 remediation, or verified infrastructure. A limited mobile beta is possible only with the documented exclusions accepted, and must not claim mobile parity. | [Ledger] final disposition. |
| D2 | Product position | Build an Arabic-first **opportunity loop** (find → understand → save/alert → apply → track → message), not a LinkedIn clone. Networking is a distinct layer, not a proven prerequisite. | [Inference] from market + competitor notes. |
| D3 | Payments | Keep paid checkout closed until idempotent checkout is proven in a HyperPay sandbox. No local evidence supports payment methods, willingness to pay or employer subscriptions. | [Ledger: partly] checkout idempotency; market note §1.6 gap. |
| D4 | Sessions | Make atomic refresh consumption and replay detection a launch blocker. Whether deleted/suspended users' access tokens stay valid is **[Unverified by ledger]** (API-DB-01) — test it first. | [Ledger: partly]; API note. |
| D5 | Owner scope decisions | Decide, in writing: billing/premium, employer/recruiter workspace, Karama/ratings, companies search, Saved. Billing and employer code exist while `project-spec.md` defers them (CM-01). Do not delete live scope to match a stale document. | Traceability note (R-13–R-15, CM-01). |
| D6 | Legal | Engage Palestinian counsel now. PDPL No. 24/2026 operates 26 Nov 2026 (Art. 35, 30 days from 27 Oct 2026 Gazette); the Art. 32 12-month period is separate. Make no compliance claim. | [Legal requirement]; trust note §2. |
| D7 | Delivery channel | Resilient mobile web plus a usable desktop employer flow; native is not a prerequisite for core value. Fix M1–M9 before any parity claim. | Market note §2.1; [Ledger] M1–M9. |
| D8 | Validate before committing | Run West Bank and Gaza user tests on interruption recovery, Arabic terminology, verification meaning and alerts before fixing offline scope, taxonomy or SMS. | Market note §3 gaps. |
| D9 | Trust model | Explainable identity states and human-accountable reporting; never conflate paid promotion with verification; no opaque "trust score". | Market note §2.2; competitor note rec. 4. |

## 2. Palestine market evidence

Every figure carries its denominator. "PCBS et al." = PCBS, Ministry of Telecommunication & Digital Economy and Telecommunication Regulatory Authority.

### 2.1 Connectivity, devices, labour

| Measure | Value | Denominator / scope | Date | Source | Do not infer |
|---|---|---|---|---|---|
| Gaza internet access | ~71% accessed at least once; 60% intermittent only, 11% continuous, 29% none | People 10+, Gaza | LFS fieldwork 3 Sep–31 Oct 2025; release 17 May 2026 | PCBS et al., *Digital Lifeline* | 71% ≠ 71% reliable access |
| Gaza access problems | 98% poor coverage; 97% persistent disruption; 77% interruptions/severe mobile limits; 73% danger while accessing | Respondents, Gaza | same | same | 73% is access danger, not scam or harassment prevalence |
| Mobile coverage, central Gaza | ~96% | Central Gaza only; varies by governorate | April 2026 | same | Not Gaza-wide, not continuous, not a network generation |
| Gaza use, earlier baseline | 61% used in prior 3 months; 39% could not access even once; pre-conflict 80% | People 10+, Gaza | Nov–Dec 2024; release 17 May 2025 | PCBS & MTDE, *Gaza Fights for a Connection* | "Only 39% used the internet" is wrong |
| Gaza towers | ~64% of 841 operator towers out of service; pre-conflict 2G coverage 98% | Palestinian-operator towers, Gaza | early April 2025 | same | Historical context only |
| Fixed fibre | 327,000 FTTH subscriptions, +27% vs 2024; DSL declining | Subscriptions, not Gaza-specific | 2025 | PCBS et al. 2026 | Do not design only for fibre |
| 4G | Israel approved 4G for Palestinian operators in the West Bank | Approval report | 6 Jan 2026 | Reuters | Not deployment, availability, devices or throughput |
| Smartphone ownership | ~35% Gaza (down from ~58% in 2023); 86% West Bank | People 10+; Gaza 3 months before 2025 interviews; West Bank Q1 2026 | 2025 / Q1 2026 | PCBS et al. 2026 | No combined Palestinian rate |
| OS web-usage share | Android 73.29%, Windows 15.86%, iOS 8.92% | Web analytics, Palestinian territory, all platforms | Oct 2026; accessed 13 Nov 2026 | StatCounter | Not ownership, capability or "all devices are low-end" |
| West Bank unemployment | 28.1% (ICLS-19) | Labour force 15+, West Bank | Q3 2026; release 11 Nov 2026 | PCBS | Not all-Palestine, not Gaza |
| West Bank graduate youth unemployment | 44.0% (males 24.1%, females 58.5%) | Ages 19–29, intermediate diploma or higher, West Bank | Q3 2026 | PCBS | Not all-Palestine |
| Employment terms | 37.6% of private-sector wage employees had no contract; 13.2% below stated monthly minimum wage | Private-sector wage employees, West Bank | Q3 2026 | PCBS | Not proof of any advertiser's wrongdoing |
| Local listing sample | Bilingual title, deadline, location, external-email apply, report/save/share, salary "N/A" | One Jobs.ps listing | Posted 12 Nov 2026; accessed 13 Nov 2026 | Jobs.ps | One listing sets no salary-disclosure norm |

### 2.2 Implications

- **[Inference]** "Online" is not binary. Interruption recovery matters more than a network-generation label; West Bank, Gaza, fixed and mobile are separate profiles.
- **[Inference]** Mobile/Android deserves first-order testing; desktop stays relevant for employers; iOS is not ignorable. No source proves a native app is required.
- **[Inference]** Arabic-first means complete Arabic journeys with deliberate bidirectional handling (W3C: `dir="rtl"` on the root, separate `lang`, logical start/end CSS, `dir="auto"` for user text). Dialect versus MSA and desired English share are unmeasured.
- **[Recommendation]** Core: preserved input, safe non-duplicating retries, explicit offline/failure states, deadlines shown before applying, structured location/deadline/type fields, CV or external apply, a record of submissions, save/share/report, WCAG 2.2 AA.
- **[Recommendation]** Optional later: full English UI, native-only features, SMS, paid employer services, reputation scores.

### 2.3 Not evidenced — do not assert

Preferred payment methods; willingness to pay; employer subscription demand; currency expectations; scam prevalence; connectivity speed; Android version, memory or storage; language/dialect preference; market share or adoption for any product; remote-work demand; offline demand. Each is a named research gap in the market note.

## 3. Competitor analysis

Set: LinkedIn, Indeed, Bayt, WUZZUF (global/regional); Jobs.ps, Joby, Hiring.ps, Wzafni (Palestinian); Upwork (adjacent freelance marketplace only). All pages accessed 13 Nov 2026 unless stated. Counts are point-in-time, not market size.

### 3.1 Global and regional

| Product | Core model and loop | Messaging / network | Trust and safety | Arabic / mobile | Monetization (page-observed) |
|---|---|---|---|---|---|
| **LinkedIn** | Profile/résumé, connections, groups, content, jobs. Easy Apply (cannot be edited or withdrawn) or Apply to employer site. Job alerts. | Messages to connections; message requests; InMail needs Premium unless Open Profile. | Safety Center; optional government-ID/selfie verification (App Store). | `AR` in Apple language codes; Arabic in accessibility page. States WCAG 2.2 AA adoption with third-party AT audits. iOS v9.1.588, 9 Nov 2026. | Free + in-app purchases; Premium InMail; Talent Solutions. |
| **Indeed** | Aggregated search, smart filters, saved résumé apply, tracking, saved jobs, alerts. | Employer↔seeker messages from listings; receipts; spam report; moderation holds. | Reporting/phishing/scam guidance in Messages help. | `AR` in Apple codes (not proof of RTL quality). iOS v334.0.0, 9 Nov 2026. | Free posts lose relative visibility; Standard/Premium Sponsored Jobs. |
| **Bayt** | Public CV/profile, job search, alerts, applicant insights, People Search, BaytGPT (CV Health, job fit). | Paid People Contact credits to reach recruiters or public members. | Stay Safe fraud guidance and reporting route. | Arabic version; iOS and Android apps. | Basic $0, Premium $19.95/mo, Elite $49.95/mo list prices; badges, ranking, CV refresh, application promotion. |
| **WUZZUF** | Egypt jobs; AI profile/CV tools; voice applications; 1-Click Apply; tracking; alerts. | Not documented. | Not documented. | Reviewed iOS listing: English only (`EN`); released 12 Aug 2026, updated 5 Nov 2026. Website paths returned errors. | Not established. |
| **Upwork** (adjacent) | Proposals, contracts, Project Catalog, badges. | Keep communication on-platform for protection. | Work history, badges, milestone/hourly payment protection. | Not assessed. | 0%–15% freelancer fee; Connects; Freelancer Plus. |

### 3.2 Palestinian

| Product | What it is | Apply / alerts | Language / distribution | Trust and accessibility | Inventory (13 Nov 2026) |
|---|---|---|---|---|---|
| **Jobs.ps** | Full local portal: jobs, tenders, training, CVs, employer areas. | Free Resume Builder; one-click apply; Job Matcher email alerts; self-described email/SMS alerts; saved jobs; Facebook/LinkedIn login. | Arabic-first UI; English names common; signup requires the name in English. | Report/save/share on listings. Accessibility built with Humanity & Inclusion and EU funding; skip link — not a WCAG claim. | City/category browsing; November 2026 deadlines. |
| **Joby** | Local plus regional jobs, tenders, remote, company directory. | Arabic/English CV builder, AI writing help, PDF; CV scanner (score /100); alerts by email or phone; many listings external. | Arabic/English switch; iOS and Android apps; "phone-exclusive features" not enumerated. | Moderation and verification not established. | 323 open jobs, 156 organizations, 57 remote, 61 Palestine results. |
| **Hiring.ps** | Beta aggregator of jobs, training, tenders, procurement. | "No CVs or tender submissions are collected. Apply through the original source." RSS feed; no email/SMS/push shown. | Arabic and English; mixed-language filter values. | Provenance by source handoff; moderation not established. | 137 results. |
| **Wzafni** | Arabic content site: jobs (Gaza/West Bank), scholarships, news. | Google Form registration; no integrated application tracker seen. | Share links (Facebook, WhatsApp, Telegram, X, LinkedIn…); Facebook group. | Not established. | 2026 items. |

### 3.3 Patterns **[Inference]**

1. The reusable baseline is a loop: profile/CV → relevant discovery → alert → apply or source handoff → track. Jobs.ps covers most of it locally; Hiring.ps shows a lightweight aggregator without owning CVs.
2. Three application architectures coexist locally: hosted (Jobs.ps), external handoff (Hiring.ps, many Joby listings), shareable content (Wzafni). Provenance, expiry and duplicate control matter most in the latter two.
3. "Jobs" locally includes tenders, training and scholarships. Whether Palestinian demand supports one taxonomy is unvalidated.
4. Monetization changes incentives: employer visibility (Indeed), job-seeker ranking (Bayt), reach (LinkedIn), earnings fees (Upwork). Paid status must not read as verification.
5. AI is attached to bounded tasks (CV health, job fit, voice apply) rather than a general chatbot.
6. Arabic availability is uneven; language codes are only a signal. Only Jobs.ps among Palestinian pages stated accessibility support.
7. Escrow, proposals and Connects are out of scope unless freelance work is explicitly approved.

### 3.4 Competitor-evidence gaps

No market share, active-user or revenue data. Offline, draft and queued-submission behaviour unverified for every competitor. No authenticated employer dashboards or moderation operations reviewed. Employer pricing for Jobs.ps, Joby and Wzafni unknown. Pricing varies by country, tax and promotion; re-fetch before quoting.

## 4. Baydar capability and gap analysis

Baydar status comes from the audit notes, never from competitor pages. All static findings are source-level, not device, provider or cloud runtime results.

### 4.1 Capability vs benchmark

| Area | Benchmark (3.x) | Baydar evidence | Status | Gap / action |
|---|---|---|---|---|
| Jobs list, detail, apply with cover letter | Core in all job products | Traced in `docs/api-contract.md` and jobs module; core journey present on mobile | Traced, not runtime-run | Source, retrieved-time, deadline and hosted/external fields: not assessed in the notes. |
| Application continuity | Mobile apply, tracking (WUZZUF, Indeed) | Offline banner exists; message retry reuses `clientMessageId` | **[Ledger: confirmed]** M6: any refresh error clears the session | Draft preservation and offline queue: no evidence either way. Fix M6 first. |
| Saved items | Indeed saved jobs; Jobs.ps saved jobs | Web nav shows Saved and Employer but the host handler has no case; no Saved route or API; schema not exported | **[Unverified by ledger]** (CM-02, R-15) | Owner: hide or build; jobs/opportunities first. |
| Alerts and preferences | LinkedIn per-topic controls; Jobs.ps/Joby email/SMS | Preference endpoints and web screen exist; mobile notification-settings screen exists | **[Ledger: confirmed]** M2: settings hub unreachable on mobile | Link the hub. Email durability **[Unverified by ledger]** (API-DB-05: failure leaves notification pending, marks activity read, no retry). |
| Messaging | Indeed receipts/spam report; LinkedIn rules | Messaging, SSE, optimistic retry exist | **[Ledger: confirmed]** M4: only latest 30 messages load | Older-page pagination; typing indicators not at mobile parity **[Unverified by ledger]**. |
| Report and block | Indeed/Bayt report routes | Report/block endpoints and blocked-users list exist | **[Unverified by ledger]** API-DB-19: reactions/reposts skip block checks; API-DB-14: bans do not revoke sessions | Central interaction-authorization policy. |
| Employer tools | Indeed posting, screening, pipeline | List, job, applicant, status-update screens exist (mobile, web) | **[Ledger: confirmed]** M3 (discoverability, not absence); CM-01 scope conflict | Role-aware entry; owner scope decision; `building` icon has no web renderer **[Unverified by ledger]**. |
| Employer verification states | LinkedIn ID verification; Bayt guidance | No evidence in any note | Unknown | Define states and meaning before launch. |
| Account export and deletion | Platform and PDPL duties | Typed `DELETE_MY_ACCOUNT` confirmation correct; export exists | **[Ledger: confirmed]** M7: export uses raw token, skips refresh (hardening, not a disclosure) | Deletion is an anonymizing status update, not erasure **[Unverified by ledger]** (API-DB-06). Retention service exists but is not operationally verified (R-04). |
| Arabic and RTL | LinkedIn/Indeed/Bayt Arabic | `ar-PS` default, RTL root, tokens | **[Ledger: confirmed]** M5: locale cannot be selected or restored | Native physical margins and `textAlign` **[Unverified by ledger]**; Karama English-only (M11) **[Unverified by ledger]**. |
| Deep links | Cross-device continuity | Profile, message, job, verify and reset map to targets | **[Ledger: confirmed]** M8: `/post/:id` drops the ID | Add post destination. |
| Composer media | Standard | Presign + PUT upload | **[Ledger: confirmed]** M9: upload failure bypasses composer error state | Catch and localize; S3/picker behaviour unverified. |
| Accessibility | LinkedIn WCAG 2.2 AA; Jobs.ps support | WCAG 2.2 AA is the product target | **[Unverified by ledger]** (shared-UI note, no screen-reader audit): native MessageBubble label omits content; inert native search/profile controls; focus ring token vs contract; RadioGroup focus invisible; nested buttons in Chip; Menu focus return | Fix, then audit RTL and mixed-direction flows with AT and disabled users. |
| Payments | Employer visibility products | HyperPay result validated against invoice, amount, currency, payment ID; OWNER/ADMIN scope enforced | **[Ledger: confirmed]** both; **[Ledger: partly]** checkout creates a new subscription and invoice on every call | Idempotency key; HyperPay sandbox proof. |
| Rewards (Karama) | None in set | Balance, ledger, redemption exist | **[Ledger: confirmed]** M1: new idempotency key per redemption call; scope unclassified (R-13); concurrency race **[Unverified by ledger]** (API-DB-09) | Stable key per intent; owner decision. |
| Security baseline | Table stakes | Helmet, explicit CORS, wildcard rejected in production | **[Ledger: confirmed]**; **[Ledger: partly]** refresh rotation is read-then-update, no reuse detection | Atomic consume plus concurrency tests. |
| AI assistance | Bayt, Joby, WUZZUF | No Baydar AI evidence in any note | Unknown | Only bounded, editable, reviewable tasks if scoped. |

### 4.2 Mobile M1–M9 **[Ledger: confirmed — static]**

| ID | Finding | Severity |
|---|---|---|
| M1 | Karama retry gets a fresh idempotency key; lost response can deduct twice | High |
| M2 | Settings hub unreachable; notification preferences have no normal entry | High |
| M3 | Employer surfaces exist but nothing navigates to `/employer` (do not call the feature absent) | High |
| M4 | Thread loads 30 messages, discards cursor | High |
| M5 | Language toggle unreferenced; stored locale loader never called | Medium |
| M6 | Transient refresh failure clears the session | Medium |
| M7 | Export reads raw token, skips freshness path | Medium |
| M8 | `/post/:id` link lands on feed | Medium |
| M9 | Upload errors escape composer error state | Medium |

### 4.3 Reported only outside the ledger — revalidate **[Unverified by ledger]**

- **API/DB note (P0–P3):** deleted/suspended JWTs stay valid (API-DB-01); one-time-token flows non-atomic; post-commit email failure strands flows; notification email lacks durable retry; forwarded-IP throttling fail-open and Karama endpoint unthrottled; health/readiness can report green while Postgres is down; reaction/repost/reply gaps; media signature, scan and range handling; seed scripts refuse only `NODE_ENV=production`; shared profile-update contract sends `viewer` into Prisma.
- **Conflict to resolve:** the API note audits Paddle/Stripe webhook services and `docker-compose.prod.yml`; the ledger audits HyperPay and Terraform. The notes do not reconcile which paths are current, so API-DB-04 and API-DB-08 need source re-checks.
- **Mobile M10–M12:** blocked-user "load more" replaces the page; Karama English-only; several screens exceed the 300-line rule.
- **Traceability:** Saved and Employer nav without handler; stale `AGENTS.md` commands (`pnpm typecheck` vs `type-check`); API contract omits billing, companies, Karama and notification preferences.
- **Test posture (reported, historical):** API 27 suites / 274 tests passed with 29.09% branch coverage and no auth, billing, Karama-concurrency, privacy or media integration tests; API `tsc` failed on missing `@nestjs/*` packages; ESLint v10 vs legacy config. The ledger states no fresh suite was run.

### 4.4 Not checked

Live payments, real devices, cloud deployment, fresh builds and tests, Arabic native rendering, TalkBack/VoiceOver behaviour, push delivery.

## 5. Regulatory register

Research paraphrases of Arabic texts, not authoritative translations. Counsel must apply the official text to Baydar's entity, users, vendors and launch date.

| # | Instrument | What the notes establish | Type | Counsel verification |
|---|---|---|---|---|
| 1 | PDPL Decree-Law 24/2026 (Gazette 243, 27 Oct 2026) | Issued 12 Oct 2026. Art. 35: operates 30 days after publication = **26 Nov 2026** (future at cut-off). | Legal requirement | Confirm commencement, amendments, regulations, extensions on the actual launch date. |
| 2 | PDPL Art. 32 | Entities rectify status within 12 months of publication (Cabinet may extend). Not a delay of the whole law. | Legal requirement | Which duties the corrective period covers. |
| 3 | PDPL Arts. 1–2, 5–6, 11 | Broad personal-data definition; in-State and extraterritorial scope; purpose limits, minimization; processing bases (legitimate interest must be proven beforehand). | Legal requirement | Field-by-field basis matrix; controller/processor/recipient role per vendor. |
| 4 | PDPL Arts. 9–10, 12 | Prior notice; explicit consent; withdrawal implemented within **3 business days**; recipients informed within **1 business day** after. | Legal requirement | Notice wording; consent records. |
| 5 | PDPL Arts. 7–8, 20 | Rights incl. access, machine-readable copy, portability, protection from legal-effect automated decisions; automated processing is a DPO trigger. | Legal requirement | Export timing is **unresolved** (no fixed days); recruitment screening/ranking review. |
| 6 | PDPL Arts. 3, 9 | Consent for minors via verified representative; no numeric age threshold found. | Legal requirement / unresolved | Target age; Cabinet children's-data controls. |
| 7 | PDPL Arts. 16–17, 19–23 | Privacy by design, sensitive-data register, annual reports, processor contracts, controller liability, DPO analysis, DPIA where the Authority determines. | Legal requirement | DPO mandatory?; registration, certification, DPIA list. |
| 8 | PDPL Arts. 24–26 | Transfers need documented consent or written Authority permission, plus safeguards and records; exceptions in Art. 25. | Legal requirement | Map every hosting, analytics, email/push and support route. |
| 9 | PDPL Art. 15 | Qualifying deletion: controller within **7 days** of request, immediate notice to recipients; recipient within **7 days** of notice. Art. 15(4) exceptions apply. No backup grace period in text. | Legal requirement | Retention exceptions; backup handling. |
| 10 | PDPL Art. 18 | Processor notifies controller **immediately**; Authority and subject notices follow Authority-set procedures and periods. **No fixed 72-hour or other general deadline** in the reviewed text. | Legal requirement / unresolved | Current Authority instructions. |
| 11 | Cybercrime Decree-Law 10/2018, Arts. 1, 31 | Service providers keep subscriber information **not less than three years**. | Legal requirement, scope-dependent | Whether Baydar is covered; which fields; reconcile with Art. 15 deletion. |
| 12 | Council of Ministers Decision 3/2019, Art. 1 | Prior permission for commercial use of service recipients' personal data. | Legal requirement | Permission route; fit with PDPL, before any secondary commercial use. |
| 13 | Labour Law 7/2000, Arts. 2, 16; CRPD Art. 27 | Equal opportunity; no discrimination in working conditions; CRPD bars disability discrimination in recruitment. | Legal / treaty | Protected grounds, occupational exceptions, employer vs platform duty. |
| 14 | Electronic Transactions Decree-Law 17/2024 | Repeals Decree-Law 15/2017 (Art. 63); e-records, e-contracting, trust services need a licence; Art. 25 recognizes electronic funds transfer, payment means specified by the PMA. | Legal requirement | Click-acceptance sufficiency; qualified services; payment licensing. |
| 15 | CRPD Arts. 9, 21 (Palestine acceded 2 Apr 2014) | ICT accessibility obligation. **No binding Palestinian WCAG incorporation was verified** — not proof none exists. | Treaty / unresolved | Implementing rules and scope. |
| 16 | Apple 5.1.1(v), Google Account Deletion | In-app account deletion (iOS); in-app plus web deletion initiation (Play). | Platform requirement | Recheck at submission. |
| 17 | Apple 1.2, Google UGC | Acceptable-use rules, reporting, blocking, moderation; no numeric takedown deadline. | Platform requirement | Unlawful-content orders, intermediary duties. |
| 18 | Apple 3.1–3.2, Google Payments | Digital in-app features generally use store billing; physical, P2P and org-sales cases differ; external billing is storefront- and programme-specific. | Platform requirement, conditional | Classify each purchasable item before building. |

**Claims not to make:** PDPL already enforceable on 13 Nov 2026; all duties postponed 12 months; mandatory 72-hour breach notice; seven-day export deadline; instant permanent erasure or three-year retention of all data; WCAG 2.2 AA mandated by Palestinian statute (or no accessibility obligations); 2017 e-transactions decree still primary; "legally compliant"; "WCAG certified"; "employers are verified".

## 6. Infrastructure and operational targets

### 6.1 Current state **[Ledger]**

- **Confirmed in source:** ECS/ECR, private service networking, Secrets Manager references, CloudFront with a VPC origin; RDS `publicly_accessible = false`, production multi-AZ, 14-day backups, deletion protection. Correction: public HTTPS is CloudFront plus VPC origin, not simply a "public ALB".
- **Unresolved:** deployed health of API, web, database and HyperPay is unproven. The web environment uses a fixed CloudFront API URL while the ingress configuration hardcodes load-balancer, listener and target ARNs (coupling and drift risk). Root Terraform modules do not include `infrastructure/aws` or `infrastructure/public-ingress`; apply order is undocumented.

### 6.2 Targets **[Proposed unless marked statutory]**

| # | Target | Basis | Verification |
|---|---|---|---|
| T1 | Each Terraform root passes format/validate and a reviewed plan; apply order documented | Ledger §3, §5 | Plan output per root; a plan is not deployment proof |
| T2 | Post-apply checks of API, web, database connectivity, DNS/TLS | Ledger §5 | Recorded health evidence |
| T3 | Environment-specific values injected per environment, not hardcoded | Ledger §3 drift risk | Staging plan shows no foreign ARNs |
| T4 | Keep multi-AZ, 14-day backups, deletion protection; add a tested restore drill. RPO/RTO unset | Ledger §3; trust note §6.2 "tested recovery" | Drill record |
| T5 | Deletion pipeline within the **7-day** ceiling, vendor propagation tracked (statutory ceiling; stricter internal target TBD) | PDPL Art. 15 | Timestamped request→completion evidence |
| T6 | Consent withdrawal applied within 3 business days; recipients notified within 1 business day after (statutory) | PDPL Art. 9 | Event log |
| T7 | Incident runbook: awareness timestamp, immediate processor escalation, Authority decision per current instructions; no published fixed hour count | PDPL Art. 18 | Tabletop exercise |
| T8 | Least privilege, MFA for privileged accounts, encryption in transit and at rest, managed secrets, audit logs, rate limits, scanning | Trust note §6.2 | Control review |
| T9 | Root `type-check`, lint, tests and build rerun on the exact worktree; no reliance on historical green | Ledger §5 | CI record |
| T10 | WCAG 2.2 AA across core and account-lifecycle journeys | Market §2.1, trust §10 | Automated + AT + disabled-user sessions in Arabic RTL and mixed text |
| T11 | Moderation targets published only if staffing can meet them | Trust note §7.2 | Queue metrics |
| T12 | Latency, availability, RPO/RTO and performance budgets: **deliberately unset** — the notes hold no field data | Market note §3 gaps | Measure under real operator conditions (West Bank/Gaza, Wi-Fi/mobile) first |

## 7. Phased roadmap **[Proposed]**

| Phase | Scope | Exit gate |
|---|---|---|
| **0 — Decide and baseline** | Owner decisions D5; counsel engaged (PDPL operates 26 Nov 2026); rerun root gates on the exact worktree; web route/component inventory; reconcile Paddle/Stripe vs HyperPay paths and compose vs Terraform. | Written decisions, gate results, revalidation register. |
| **1 — Integrity blockers** | Idempotent checkout and HyperPay sandbox proof; atomic refresh consumption with replay tests; confirm and fix deleted/suspended token handling; M1 stable redemption key; unthrottled and fail-open controls checked. | Ledger §5 actions 1–2 pass; paid entry stays closed otherwise. |
| **2 — Mobile reachability** | M2/M3 entry points; M4 history; M5 locale; M6 transient refresh; M7 export; M8 post link; M9 upload errors; Saved and Employer navigation resolved. | M1–M9 exercised on Android and iOS, incl. offline refresh, 30+ messages, Arabic relaunch. |
| **3 — Opportunity loop** | Provenance and deadline fields; save/alert; application drafts and safe resubmission; durable email outbox; common block/report policy. | Discover→apply→track→message works with no dead navigation. |
| **4 — Privacy, trust, accessibility** | Data map, notices, consent, deletion/export orchestration, retention schedule, in-app plus web deletion, UGC rules and moderation owner, recruitment-discrimination review, WCAG 2.2 AA fixes. | Counsel-reviewed data map and policies; store-ready disclosures. |
| **5 — Validate with users** | West Bank and Gaza job seekers, employers, disabled users: interruption recovery, Arabic terminology, verification meaning, alert tolerance; device and operator tests. | Observed task success replaces assumptions; budgets set. |
| **6 — Limited beta** | Small invited cohort, named support owner, rollback, explicit exclusions. | Owner sign-off; infra T1–T4 evidence; no parity claim. |
| **7 — Conditional monetization** | Only after demand research, store/PMA/provider/tax review. | Out of the application critical path. |

## 8. Unverified-claims register

| Claim | Why unverified |
|---|---|
| Deleted or suspended users keep valid access tokens | API note only; ledger has no verdict. |
| Account deletion is an anonymizing update, not erasure | API note only. |
| Karama transfer race and negative balance | API note only. |
| Block checks missing on reactions/reposts; bans do not revoke sessions | API note only. |
| Notification email has no durable retry | API note only; deployment-dependent. |
| Native a11y and RTL defects; Saved/Employer nav handler gap | Shared-UI and traceability notes only; no AT or device audit. |
| M10–M12 | Mobile note only. |
| Payment provider acceptance, deployed health, device behaviour, fresh build/test results | Ledger: not checked. |
| Any Baydar offline, draft, AI or employer-verification capability | No evidence in any note. |
| Competitor offline behaviour, moderation internals, authenticated workflows | Public pages only. |

## Appendix A — Sources (as recorded in the notes; accessed 13 Nov 2026 unless dated)

**Market.** PCBS et al., *Digital Lifeline in Palestine*, 17 May 2026: https://www.pcbs.gov.ps/en/post-details/?postId=26011 · PCBS & MTDE, *Gaza Fights for a Connection with Life*, 17 May 2025: https://www.pcbs.gov.ps/en/post-details/?postId=22663 · PCBS Q3 2026 West Bank LFS, 11 Nov 2026: https://www.pcbs.gov.ps/en/post-details/?postId=27412 · Reuters, 6 Jan 2026: https://www.reuters.com/world/middle-east/israel-approves-4g-mobile-services-palestinians-west-bank-2026-01-06/ · StatCounter, Oct 2026: https://gs.statcounter.com/os-market-share/all/palestinian-territory/2025 · Jobs.ps listing (posted 12 Nov 2026): https://www.jobs.ps/jobs/project-manager-69920 · Jobs.ps: https://www.jobs.ps/ · W3C RTL markup: https://www.w3.org/International/questions/qa-html-dir · W3C inline bidi: https://www.w3.org/International/articles/inline-bidi-markup/ · WCAG 2.2 (Recommendation 12 Dec 2024): https://www.w3.org/TR/WCAG22/

**Global and regional competitors.** LinkedIn: https://apps.apple.com/us/app/linkedin-community-network/id288429040 · https://itunes.apple.com/lookup?id=288429040&country=us · https://www.linkedin.com/help/linkedin/answer/a512388 · https://www.linkedin.com/help/linkedin/answer/1645 · https://www.linkedin.com/help/linkedin/answer/a546814 · https://www.linkedin.com/help/linkedin/answer/a1378534 · https://www.linkedin.com/help/linkedin/answer/76636 · https://www.linkedin.com/help/linkedin/answer/a517979 · https://safety.linkedin.com/ · https://business.linkedin.com/talent-solutions · https://www.linkedin.com/accessibility · https://www.linkedin.com/accessibility/reports
Indeed: https://apps.apple.com/us/app/indeed-job-search/id309735670 · https://itunes.apple.com/lookup?id=309735670&country=us · https://www.indeed.com/help/job-seekers/articles/40356306296589-about-indeed-messages?hl=en&co=US · https://www.indeed.com/help/job-seekers/topics/360002868851-messages?hl=en&co=US · https://www.indeed.com/hire · https://www.indeed.com/hire/cs/pricing
Bayt: https://www.bayt.com/en/premium/ · https://www.bayt.com/en/baytgpt/ · https://www.bayt.com/en/employers/ · https://www.bayt.com/en/pages/security-message/ · https://apps.apple.com/us/app/bayt-com-job-search/id510893233
WUZZUF: https://apps.apple.com/eg/app/wuzzuf-ai-job-search-app/id6766823412 · https://itunes.apple.com/search?term=wuzzuf&entity=software&country=eg&limit=5
Upwork: https://www.upwork.com/i/how-it-works/freelancer/ · https://www.upwork.com/i/how-it-works/client/ · https://www.upwork.com/talent/badges · https://support.upwork.com/hc/en-us/articles/211062538-Freelancer-Service-Fees

**Palestinian competitors.** Jobs.ps signup: https://www.jobs.ps/job-seeker/signup · Joby: https://joby.ps/ · https://joby.ps/cv_builder.php · https://joby.ps/cv_scanner.php · https://joby.ps/register.php · https://joby.ps/alerts.php · https://joby.ps/post_job.php · https://joby.ps/post_tender.php · https://play.google.com/store/apps/details?id=ps.joby.app · Hiring.ps: https://hiring.ps/en/ · https://hiring.ps/ar/ · https://hiring.ps/feeds/jobs.xml · Wzafni: https://www.wzafni.com/ · https://www.facebook.com/groups/forsa.job/

**Legal and platform.** PDPL 24/2026: https://maqam.najah.edu/legislation/2167/ (Gazette 243 PDF linked from that record) · Electronic Transactions 17/2024: https://maqam.najah.edu/legislation/1784/ · Cybercrime 10/2018: https://maqam.najah.edu/legislation/83/ · Labour Law 7/2000: https://maqam.najah.edu/legislation/1/ · Decision 3/2019: https://maqam.najah.edu/legislation/247/ · Basic Law: https://www.palestinianbasiclaw.org/basic-law/2003-amended-basic-law · CRPD: https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-rights-persons-disabilities · UN Treaty status: https://treaties.un.org/Pages/ViewDetails.aspx?src=TREATY&mtdsg_no=IV-15&chapter=4&clang=_en · Apple Guidelines: https://developer.apple.com/app-store/review/guidelines/ · Google Play: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en · https://support.google.com/googleplay/android-developer/answer/9876937?hl=en · https://support.google.com/googleplay/android-developer/answer/10144311?hl=en · https://support.google.com/googleplay/android-developer/answer/16558241?hl=en · https://support.google.com/googleplay/android-developer/answer/9858738?hl=en

## Appendix B — Note files used

`research_notes/palestine_market.md` · `research_notes/Baydar_trust_access_research.md` · under `research_notes/Baydar Palestine Product Audit/`: `high_severity_verification.md` (verification ledger), `competitor_products.md`, `trust_regulatory_accessibility.md`, `palestine_market.md`, `requirements_cleanup_traceability.md`, `api_database_contracts.md`, `mobile_application.md`, `shared_ui_components.md`, `shared_ui_design_systems.md`. The root and subfolder copies of the market and trust notes are byte-identical, as are the two shared-UI notes.
