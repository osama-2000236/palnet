# Palestine Product Audit and Engineering Handoff

**Report date: 13 November 2026. Source baseline: the current dirty workspace. Recommendation: NO-GO for production launch, paid checkout, or a claim of full web/mobile parity.** The current high-severity audit confirms payment and session defects, nine statically confirmed mobile findings (M1–M9), three partially established mobile findings (M10–M12), and infrastructure findings that remain runtime-unverified. Earlier API/DB findings are retained below as revalidation items, not silently promoted over the newer verdicts. The product opportunity is a bilingual professional-and-opportunity network with recoverable applications, clear provenance/deadlines, and appropriate trust controls—not a feature-for-feature LinkedIn clone. Owner decisions are required for billing, employer scope, Saved items, Karama, and the breadth of the market. No secrets are reproduced in this report. All command outcomes are historical; none were rerun for this document.

## 1. Executive decisions and evidence limits

### 1.1 Owner decisions before implementation is “complete”

| Decision | Recommended position | Why it matters | Required exit evidence |
|---|---|---|---|
| Paid billing / HyperPay | **Keep checkout closed until the payment P0s are fixed and verified; otherwise disable paid entry for beta.** | Current audit: missing idempotency at checkout creation and at server-paid cross-checking. Earlier API audit also identifies payment-state/invoice risks. | Passing duplicate/replay/provider-verification tests; HyperPay sandbox evidence; approved plan/refund policy. |
| Sessions | **Treat as a launch blocker, not routine hardening.** | Current audit: no per-request validation against persisted user state and no rotation replay detection. | Suspension/deletion/revocation tests; refresh/replay/concurrency tests. |
| Employer workspace | **Define the minimum employer journey before exposing it.** | Current M3: employer routes are hidden or incomplete on mobile. Earlier product scope includes employer functions. | Approved roles and permissions; complete create-role → applicant → status/contact journey on web and mobile. |
| Saved jobs/opportunities | **Add jobs/opportunities first; hide unsupported targets.** | Saved/alert behavior is central to the opportunity loop, while current mobile parity is incomplete. | Save/list/un-save tests, offline label, navigation tests, and explicit target scope. |
| Karama / points | **Do not promise value until redemption and concurrency are safe and explained.** | Earlier API audit identifies balance/redemption integrity risks; current mobile retry behavior can repeat a successful operation. | Idempotency and overdraw tests; value/expiry copy; owner approval. |
| Market breadth | **Validate jobs, internships, training, and scholarships before one taxonomy.** | Competitors demonstrate several models, not Palestinian demand for all of them. | Local task tests and employer interviews; approved opportunity schema. |
| Connectivity target | **Validate, do not assume.** | The notes provide no Palestinian bandwidth, device, or offline-demand telemetry. | Device/interruption tests on representative hardware; measured recovery success. |
| Legal posture | **Obtain Palestinian counsel; do not treat this report as legal advice.** | The legal note is dated 13 November 2026 and identifies a forthcoming decree and unresolved implementation questions. | Counsel-reviewed data map, notices, retention/deletion rules, and implementation dates. |

### 1.2 Evidence vocabulary

- **Confirmed static:** established by source in the current high-severity audit. It does not establish production exploitability.
- **Earlier audit finding:** established by an earlier note but requires revalidation against the release candidate and takes lower precedence if it conflicts with the newer verdict.
- **Runtime risk / unverified:** requires device, provider, deployment, or cloud evidence.
- **Recommendation:** proposed product or engineering work, not a factual claim about users or existing behavior.

### 1.3 Coverage gap — first verification follow-up

The dedicated web audit failed twice and produced no `web_application.md`. Therefore this is **not a complete web audit**. Web statements below are limited to requirements, mobile parity comparisons, and earlier engineering notes. **First follow-up:** inventory every `apps/web` route, component, API consumer, and test; then repeat the clean-workspace gates. Do not represent this handoff as that missing audit.

Historical source checks in the notes: API tests **274 tests / 27 suites**; API coverage **27.34% statements, 16.11% branches, 20.21% functions, 27.64% lines**; mobile **224 tests / 20 suites**; web **74 tests / 8 suites**; build passed only with `SKIP_ENV_VALIDATION=1`; lint failed on legacy configuration; root `type-check` script was missing. These are baselines, not current release proof.

---

## 2. Palestine market evidence

The following are sourced figures, not estimates generated for this report. “Accessed 2026” follows the research notes; exact retrieval days were not recorded.

| Evidence | Product implication |
|---|---|
| Internet penetration was **94%** and smartphone adoption **92%**; **94%** of users accessed the internet through mobile phones ([DataReportal, Digital 2026: Palestine, accessed 2026](https://datareportal.com/reports/digital-2026-palestine)). | Mobile-first is justified. It does not prove continuous bandwidth, low-end device distribution, or demand for offline mode. |
| Facebook had **1.90 million** users and Instagram **1.15 million**; LinkedIn had **474 thousand members**, about **14.2%** of the population ([DataReportal, Digital 2026: Palestine, accessed 2026](https://datareportal.com/reports/digital-2026-palestine)). | Social discovery habits exist; LinkedIn’s member figure is not equivalent to active professional-network usage. |
| Internet users were **1.90 million (92.5%)** in 2024; social-media users **2.05 million (62.8%)** in early 2025 ([DataReportal, Digital 2025: Palestine, accessed 2026](https://datareportal.com/reports/digital-2025-palestine)). | Social reach can exceed conventional internet-user denominators because of methodology and account differences; do not combine these into a conversion forecast. |
| GDP contracted **26%** in 2024; Gaza’s economy contracted **83%**; unemployment reached **51%** in Gaza and **31%** in the West Bank ([International Labour Organization, 2025, accessed 2026](https://www.ilo.org/resource/news/palestine-labour-market-crisis-deepens-amid-war-and-restrictions)). | Discovery, clear requirements, deadlines, and application continuity are economically important; avoid engagement-only scope crowding them out. |
| Youth unemployment was **44%** in 2024, with female youth unemployment **67%** ([ILO, 2025, accessed 2026](https://www.ilo.org/resource/news/palestine-labour-market-crisis-deepens-amid-war-and-restrictions)). | Test access to entry-level opportunities and equitable discovery; do not infer individual outcomes from aggregate statistics. |
| A cited market entry has a **95%** probability and **12–18 month** timeline ([U.S. International Trade Administration, Palestine Country Commercial Guide, accessed 2026](https://www.trade.gov/country-commercial-guides/palestine-market-entry)). | Treat any new institutional/payment integration as a lengthy program with owner approval, not a quick feature. |
| Arabic is official; English is widely used in business; Islam is the predominant religion ([ITA, Palestine Country Commercial Guide, accessed 2026](https://www.trade.gov/country-commercial-guides/palestine-market-overview)). | Arabic/RTL and bilingual professional content must work together; religious/cultural sensitivity belongs in research and content governance, not stereotyped UX. |

**Do not invent a Palestinian offline, bandwidth, device, payment, or willingness-to-pay statistic.** The notes do not contain one.

---

## 3. Competitor capability patterns

These are capability references, not evidence of local demand or a requirement to copy every feature.

| Product | Dated sourced capabilities | Bay lesson |
|---|---|---|
| LinkedIn | Profiles, feed, jobs, messaging, company pages, and recruiter surfaces ([LinkedIn Help, accessed 2026](https://www.linkedin.com/help/linkedin)); iOS professional profile/job/network listing ([App Store, accessed 2026](https://apps.apple.com/us/app/linkedin/id288429040)). | Complete the professional graph and opportunity loop before peripheral creator features. |
| Indeed | Search, saved jobs, alerts, résumé upload, and application tracking ([Indeed help, accessed 2026](https://support.indeed.com/hc/en-us/articles/120015298391-Search-for-jobs)); iOS search/résumé/application listing ([App Store, accessed 2026](https://apps.apple.com/us/app/indeed-job-search/id309735670)). | Saved opportunities, alerts, draft recovery, and application status are core journey candidates. |
| Bayt | Job search, CV, applications, and employer hiring services ([Bayt Premium, accessed 2026](https://www.bayt.com/en/premium/)); iOS CV/application workflows ([App Store, accessed 2026](https://apps.apple.com/us/app/bayt-com-job-search/id499665381)). | A focused regional opportunity product can differentiate through relevance and clarity rather than surface area. |
| WUZZUF | Job discovery, CV/profile, applications, and employer recruitment ([WUZZUF iOS, accessed 2026](https://apps.apple.com/eg/app/wuzzuf/id605939768)); employer services ([WUZZUF Employers, accessed 2026](https://wuzzuf.net/employers)). | Keep candidate and employer journeys role-specific and connected. |
| Jobs.ps | Local Palestinian vacancies and location/category discovery ([Jobs.ps, accessed 2026](https://www.jobs.ps/)); iOS local job discovery ([App Store, accessed 2026](https://apps.apple.com/us/app/jobs-ps/id6446239016)). | Local taxonomy, location relevance, and deadlines can differentiate. |
| For9a | Scholarships, fellowships, internships, jobs, contests, and opportunities ([For9a, accessed 2026](https://www.for9a.com/opportunities)); iOS opportunity discovery ([App Store, accessed 2026](https://apps.apple.com/us/app/for9a/id1474406826)). | If broader opportunities are approved, model type, eligibility, source, and deadline explicitly. |
| Upwork | Proposals, contracts, messaging, and payment protection ([Upwork, accessed 2026](https://www.upwork.com/howitworks)); iOS freelance/client workflow ([App Store, accessed 2026](https://apps.apple.com/us/app/upwork/id377801152)). | Do not import escrow/proposals/contracts without an approved freelance market. |
| WhatsApp | Private messaging, groups, calls, and attachments ([WhatsApp Help Center, accessed 2026](https://faq.whatsapp.com/)); iOS messaging/calls ([App Store, accessed 2026](https://apps.apple.com/us/app/whatsapp-messenger/id310633997)). | Users expect retry and attachment clarity; Bay need not become a general messenger. |
| Telegram | Cloud-synchronized messages, groups, media, and cross-device access ([Telegram FAQ, accessed 2026](https://telegram.org/faq)); iOS synchronized messaging ([App Store, accessed 2026](https://apps.apple.com/us/app/telegram-messenger/id686449807)). | Cross-device consistency and retry matter; do not copy Telegram’s social model. |

### Differentiation priorities

1. **Recoverable opportunity loop:** discover → understand → save/alert → draft/apply → track → message.
2. **Arabic/RTL plus bilingual professional data:** no raw translation keys, correct plurals, searchable mixed-language employer/qualification data.
3. **Provenance and trust:** source, retrieved time, deadline, eligibility, location, type, hosted/external status.
4. **Mobile continuity:** safe cached reads, local draft preservation, idempotent retries; validate actual connectivity needs.
5. **Safe professional interactions:** consistent block/report policy across reactions, comments, reposts, and messages.

---

## 4. Legal and compliance register (counsel required)

Source: `legal_compliance.md`, dated 13 November 2026. The following is an issue register, not legal advice.

| Topic | Current source position | Product/engineering action |
|---|---|---|
| PDPL | Presidential Decree No. 24/2026 on Personal Data Protection; effective **26 November 2026**, six months after *Al-Waqa’i* No. 177 publication. As of this report it is **13 days away**, not yet in force. | Do not call it currently effective. Establish an implementation plan and confirm operative guidance with counsel. |
| Notices / consent | Decree requires notice; consent, sensitive-data, profiling, and cross-border conditions require implementation interpretation. | Data inventory, purpose/retention matrix, accessible Arabic/English notices, consent/withdrawal flows where required. |
| DPO | DPO required for public entities, large-scale sensitive-data processing, or systematic monitoring. | Counsel determines applicability; if applicable, assign owner and contact path. |
| Breach | Notify the authority within **72 hours of awareness**; data subjects when high risk. | Create incident runbook with awareness timestamp, authority contact, high-risk assessment, and user-notification decision. |
| Rights / timelines | Access/copy/portability and deletion timelines require decree-specific implementation review; penalties can reach **100,000 ILS** and criminal sanctions for specified violations. | Do not invent deadlines. Counsel maps each right to operational workflow and evidence. |
| Cross-border | Personal data transfer outside Palestine requires specified safeguards. | Inventory hosting, analytics, support, email/push, backups, and subprocessors; approve transfer mechanism before enabling. |
| Cybercrime | Cybercrime Decree No. 10/2024 covers interception, unauthorized access, fraud, and related conduct; user-generated content may create publisher liability. | Security controls, moderation/contact process, evidence preservation, counsel escalation. |
| Telecom / foreign services | License required to provide telecom services; foreign digital services may require registration with the Ministry of Telecom and Digital Economy. | Counsel determines whether Bay’s actual services trigger licensing/registration. |
| Consumer / tax | Consumer protection and VAT obligations depend on actual paid services and entity structure. | Before paid launch, approve invoices, refunds, receipts, tax treatment, and records with counsel/accountant. |

---

## 5. Current engineering verdicts

### 5.1 Confirmed current high-severity findings

| ID / severity | Confirmed evidence and impact | Exact area | Smallest safe remediation | Acceptance / validation |
|---|---|---|---|---|
| **P0-PAY-1** | New idempotency key generated per checkout creation; retry after server success can create another operation. | `apps/api/src/payments/*` | Accept/reuse a client idempotency key; persist unique operation identity and return the original result. | Same key/retry returns one operation; concurrent retry test; billing integration tests. |
| **P0-PAY-2** | Server-paid cross-checks are missing at the paid boundary; client/provider result cannot be assumed sufficient. | `apps/api/src/payments/*` | Verify provider resource/status and expected operation server-side before marking paid; make state transition atomic. | Invalid/mismatched result rejected; valid sandbox payment activates once; replay does not duplicate. |
| **P0-SES-1** | No per-request validation against persisted user status; stale access can survive account state change. | `apps/api/src/sessions/*` | Validate current status/revocation on protected requests; centralize active semantics. | Deleted/suspended/revoked token fails; active token succeeds; auth integration tests. |
| **P0-SES-2** | No rotation replay detection. | `apps/api/src/sessions/*` | Detect reuse of rotated refresh token and revoke the session family; atomic consume/rotate. | Concurrent refresh yields one successor; replay revokes appropriate family; tests. |
| **M1 High** | Mobile generates new idempotency key per redemption call; retry can repeat a successful deduction. | `apps/mobile/src/api/client.ts`, redemption screen | Stable operation key per user intent; retry same key; server uniqueness. | Retry after server success returns original result, no second deduction; concurrency test. |
| **M2 High** | Settings hub exists but no ordinary navigation entry exposes it. | `apps/mobile/src/app/settings.tsx`, shell navigation | Add visible settings entry; preserve existing route/props. | Signed-in user reaches notification/account settings; navigation test. |
| **M3 High** | Employer routes are hidden/incomplete on mobile. | `apps/mobile/src/app/(app)/employer/*` | Define minimum route set and role-aware entry; enforce permissions server-side. | Employer journey works; unauthorized role denied; mobile/web parity test. |
| **M4 High** | Message view requests only latest 30 and has no older-page callback. | `apps/mobile/src/app/(app)/messages/[id].tsx` | Cursor pagination/prepend, stable scroll anchor, dedupe/retry. | Older messages load without duplicates/jump; failure preserves thread. |
| **M5 High** | Hard-coded English strings bypass i18n. | `apps/mobile/src/i18n/*` and affected components | Move strings to resources; pluralization; keep keys stable. | Arabic/English screens have no raw keys; plural cases tested. |
| **M6 High** | Account export is broken: raw `request` response, no normalization; normalized hook treats response as direct object. | `apps/mobile/src/hooks/useAccountExport.ts` | Use one normalized response contract; parse envelope/data correctly; preserve retry state. | Export downloads valid file; malformed response gives actionable error; retry works. |
| **M7 High** | Confirmed static mobile finding; see high-severity note for exact implementation evidence. | Current mobile source identified in note | Implement the smallest fix prescribed by that evidence; do not infer a broader feature rewrite. | Focused regression plus mobile suite; runtime behavior verified separately. |
| **M8 Medium** | Confirmed static mobile finding; exact evidence remains in source note. | Current mobile source identified in note | Targeted correction only. | Focused regression and device/manual check. |
| **M9 Medium** | Confirmed static mobile finding; exact evidence remains in source note. | Current mobile source identified in note | Targeted correction only. | Focused regression and device/manual check. |
| **M10–M12** | Partial static evidence; runtime validation gaps remain. Do not call these confirmed production defects. | Current mobile source and runtime paths | Close the missing runtime tests before release claims. | Device/network matrix with recorded results. |

M7–M9 are deliberately not re-characterized here without reproducing their exact source evidence; use `high_severity.md` as the authoritative detail. This avoids substituting a guess for the audit.

### 5.2 Earlier API/DB findings to revalidate, not override with newer audit

These remain important release risks but must be checked against current source before assigning final status:

| Area | Earlier evidence | Revalidation requirement |
|---|---|---|
| JWT/account lifecycle | `apps/api/src/auth/auth.guard.ts`, account service; suspended/deleted users may retain access. | Current source + deleted/suspended/revoked integration tests. |
| Refresh rotation | `apps/api/src/auth/refresh-token.service.ts`; check/consume may be non-atomic. | Parallel refresh/replay concurrency test. |
| Email outbox | Post-commit verification/reset mail can be lost; notification queue durability unclear. | Kill worker between commit/send; retry/dead-letter evidence. |
| Karama | `apps/api/src/karama/karama.service.ts`; balance/redemption race risk. | Concurrent redemption and overdraw test. |
| Social writes | Reactions/reposts/comments/block guards may not share one policy. | Blocked actor reaction/repost/comment/message matrix. |
| Feed pagination | Offset pagination can duplicate/miss under insertion. | Keyset `(createdAt,id)` test with insertion between pages. |
| Media | Upload signature/range behavior and buffering need verification. | Spoofed MIME, oversized file, valid/invalid range, memory test. |
| Seed safety | `packages/db/prisma/seed.ts` may permit unintended destructive operations. | Production-like URL refusal test before any write. |
| CI/release | Lint flat-config mismatch; missing root `type-check`; build used env bypass. | Clean frozen-lockfile CI with all gates green. |

### 5.3 Infrastructure findings — static only, runtime unverified

- Hard-coded ARNs and region coupling exist in `infrastructure/*`.
- Root modules are not wired into a single top-level apply path.
- Security groups, ECS/RDS health, provider state, DNS, TLS, backup/restore, and actual deployed health were **not runtime-verified**.
- Required follow-up: per-root state/backend/variable/apply-order documentation; `terraform fmt -check`, `terraform validate`; isolated staging `plan`; no production apply without owner approval.
- Do not describe “24/7 monitoring” or deployment health as existing unless runtime evidence is produced.

---

## 6. Functional requirements handoff

Priorities: **Launch** = needed for a safe coherent launch; **Decision** = owner scope approval required; **Next** = after core journey. Numeric values are proposed internal targets, not market facts.

| ID / priority | Requirement | Acceptance criteria | Verification |
|---|---|---|---|
| FR-01 Launch | Active-only authentication and consistent deletion/revocation. | Suspended/deleted/revoked tokens rejected; active user succeeds. | Auth integration suite; current source review. |
| FR-02 Launch | Bilingual profile: handle, name, headline, location, experience, visibility. | Arabic/English content persists; unique handle; blocked/private states correct. | Profile API/UI and RTL tests. |
| FR-03 Launch | Search/filter opportunities by query, location, type, experience, deadline. | Deterministic results under insertion; filters compose. | API search tests and task test. |
| FR-04 Launch | Detail shows source, retrieved time, deadline, eligibility, location, type, hosted/external. | Required fields visible or explicitly unavailable; external handoff understood. | Detail contract and comprehension test. |
| FR-05 Decision | Save opportunities; optional alerts later. | Save/list/un-save idempotent; cached state labeled; no dead target. | Saved API/UI tests; scope sign-off. |
| FR-06 Launch | Recoverable application draft and idempotent submission/external continuation. | Draft survives restart; double submit creates one application; external destination clear. | Interruption/device test; API idempotency test. |
| FR-07 Launch | Application status/history and relevant notifications. | Valid transitions visible; no duplicate event; preferences honored. | Application/notification integration tests. |
| FR-08 Decision | Employer role creation, applicant review, status change, contact. | Role matrix enforced server-side; full journey works. | Employer E2E and authorization tests. |
| FR-09 Launch | Per-category/channel preferences, unread state, deadline/status alerts. | Preference affects only chosen category/channel; unread persists; no duplicates. | Notification integration/device tests. |
| FR-10 Launch | Message older history, retry, attachment recovery, block/report. | Older pages dedupe; draft preserved; blocked sender rejected. | Message and safety tests. |
| FR-11 Launch | Connections/reactions/comments/reposts use common authorization policy. | Blocked writes rejected; duplicate repost safe; replies readable. | Social authorization suite. |
| FR-12 Launch | Replies readable with pagination and permissions. | Reply appears after refresh; deleted/private replies hidden. | Comment API/UI tests. |
| FR-13 Launch | Trust rules, report categories, block, support, moderation status. | User can report/block and see outcome; owner/contact documented. | Trust workflow and owner checklist. |
| FR-14 Launch | Deep links for opportunity/post/profile with safe back/not-found. | Cold/warm/sign-in return resolves same entity. | Route/device matrix. |
| FR-15 Launch | Complete Arabic/RTL and English resources/plurals. | No raw keys; correct plurals/dates/numbers; logical focus order. | Locale unit and accessibility tests. |
| FR-16 Launch | Deletion, retention explanation, export, support state. | Notice before deletion; immediate revoke; export retry; completion visible. | Account integration and policy review. |
| FR-17 Decision | Paid checkout idempotent/provider-verified. | Same operation once; invalid provider result rejected; invoice/subscription consistent. | Billing integration + HyperPay sandbox. |
| FR-18 Decision | Karama redemption safe and understandable. | No overdraw; duplicate key idempotent; value/expiry clear. | Concurrency tests and usability review. |
| FR-19 Launch | Rules/privacy/deletion/external application help discoverable. | Support and notices reachable from settings and handoff. | Navigation/content audit. |
| FR-20 Next | Saved-search/deadline alerts after tolerance testing. | Frequency configurable; no alert storm; criteria clear. | Alert integration and participant study. |

---

## 7. Non-functional requirements handoff

All figures below are **proposed targets**, not measured Palestinian field results.

| ID | Proposed requirement / target | Acceptance / verification |
|---|---|---|
| NFR-01 | Resilient reads/drafts under interruption. | Last safe read + sync timestamp; draft restores after kill/restart; interruption test matrix. |
| NFR-02 | Web p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 on agreed devices. | Lighthouse/WebPageTest lab + RUM field measurement. |
| NFR-03 | Preserve Helmet/CORS/JSON limits. | Security regression test; spoofed forwarded-IP test. |
| NFR-04 | Auth/payment/message failures observable with correlation IDs. | Staging fault injection and redacted log/trace review. |
| NFR-05 | WCAG 2.2 AA core journeys. | Automated axe plus NVDA/VoiceOver/TalkBack, keyboard, focus, contrast, RTL audit. |
| NFR-06 | CI gate: clean frozen install, typecheck, lint, test, build. | Clean CI record; no legacy parser mismatch; no missing root task. |
| NFR-07 | Proposed API p95 reads ≤400ms, writes ≤800ms under agreed load. | k6/Artillery with representative dataset and APM. |
| NFR-08 | Bounded pagination/fan-out/media memory. | Query plan, notification load, large-file memory test. |
| NFR-09 | Proposed 99.9% monthly core API availability. | Defined SLI/denominator, synthetic checks, 30-day report. |
| NFR-10 | Proposed backup RPO ≤24h / restore RTO ≤4h. | Isolated quarterly restore drill with evidence. |
| NFR-11 | Current/previous major browsers + agreed mobile versions, including low-cost Android. | Device/browser matrix and screenshots. |
| NFR-12 | Structured logs/metrics/traces; PII redaction. | Correlation-ID fault test and log inspection. |
| NFR-13 | Retention/deletion/breach runbooks owned and tested. | Counsel review + tabletop + deletion verification. |
| NFR-14 | Maintain existing public contracts; split oversized internals safely. | Characterization tests; no route/prop changes; file-size check. |
| NFR-15 | Reproducible dependencies/infrastructure. | Frozen lockfile, pinned providers, documented state/backend, validate/plan. |

---

## 8. ADD / REWIRE / OPTIMIZE / DELETE-OR-DISABLE

### ADD

| Addition | Scope / acceptance |
|---|---|
| Saved opportunities | Jobs/opportunities first; idempotent save/list/un-save; cached label; no unsupported targets. |
| Provenance fields | Add source/retrieved/deadline/eligibility/location/type/hosted-external to existing DTO. |
| Application draft + idempotency | Local recovery plus server uniqueness; no promise of offline submission. |
| Reply read endpoint | Paginated child replies under existing comment resource. |
| Transactional outbox | Auth/notification events with retry/dead-letter and exactly-once business effect. |
| Employer navigation | Only approved routes/roles; server authorization unchanged. |
| Settings navigation | Expose existing settings hub with one visible entry. |
| Trust/help content | Rules, privacy, deletion, support, external handoff explanations. |
| CI root typecheck | Real root task calling package checks; no bypass. |

### REWIRE

| Rewire | Evidence / smallest change |
|---|---|
| Payment creation → stable idempotency key | `apps/api/src/payments/*`; unique persisted operation and original-result return. |
| Paid transition → provider verification + atomic state | `apps/api/src/payments/*`; reject mismatch/replay. |
| Session guard → persisted active/revocation check | `apps/api/src/sessions/*`; no client-only fix. |
| Refresh rotation → atomic consume + replay detection | `apps/api/src/sessions/*`; revoke family on replay. |
| Mobile redemption → stable operation key | `apps/mobile/src/api/client.ts`; same key on retry. |
| Messages → cursor prepend | `apps/mobile/src/app/(app)/messages/[id].tsx`; dedupe/scroll anchor. |
| Export → normalized response contract | `apps/mobile/src/hooks/useAccountExport.ts`; no raw/direct mismatch. |
| Social writes → shared block/report policy | Reactions/reposts/comments/messages; integration matrix. |
| Feed → keyset cursor | `(createdAt,id)` shared by API/UI; insertion test. |
| Media → signature validation + streaming/ranges | Spoof/oversize/range/memory tests. |
| Seed → explicit environment/database guard | Production-like refusal before writes. |
| CI lint → flat config; typecheck root task | `pnpm lint`, package typechecks, build all run. |
| Terraform → typed environment variables/state | `infrastructure/*`; staging-only reviewed plan. |

### OPTIMIZE (after correctness gates)

1. Batch notification recipient writes while preserving idempotency.
2. Add measured unread composite index only after `EXPLAIN`.
3. Stream media rather than buffering entire objects.
4. Normalize activity timestamps and deterministic `(createdAt,id)` order.
5. Extract oversized mobile internals while preserving route exports and props.
6. Consolidate shared form schemas after behavior characterization.
7. Parameterize infrastructure and isolate state/backends.

### DELETE OR DISABLE

| Candidate | Action / guardrail |
|---|---|
| Paid checkout | Disable entry until P0 payment evidence exists; retain financial records. |
| Unsupported Saved targets | Hide affordances; do not delete approved future schema blindly. |
| Employer mobile entry | Hide only if explicitly out of beta scope; preserve server authorization. |
| Legacy ESLint parser | Replace through flat-config migration, not a parallel lint system. |
| Generated output | Clean locally only after processes stop; use reviewed ignored-file cleanup, regenerate, build. |
| Handoff/archive notes | Retain as evidence; no deletion. |

---

## 9. Phased execution plan

### Phase 0 — Evidence and scope (first)

1. Complete dedicated web route/component/API/test inventory.
2. Run clean frozen-lockfile install, Prisma generation, `pnpm build`, `pnpm lint`, package typechecks, and all API/mobile/web tests.
3. Record owner decisions for payments, employer, Saved, Karama, and beta scope.
4. **Gate:** current gate results and coverage register exist; no release claim without them.

### Phase 1 — Safety and integrity

Fix payment/session P0s, M1/M6, outbox, Karama, social authorization, and seed safety. Add integration tests before UI expansion.

**Gate:** payment replay/provider tests, deletion/revocation/replay tests, redemption concurrency, crash/retry tests, and production-like seed refusal pass. Paid routes remain closed otherwise.

### Phase 2 — Core journey coherence

Implement settings/employer navigation, message history, i18n, replies, feed cursor, deep links, Saved decision, and application continuity in small PRs with existing contracts.

**Gate:** discover → understand → save/apply → track → message works; no visible dead navigation; API/UI tests pass.

### Phase 3 — Palestine fit and trust validation

Test Arabic/RTL, bilingual data, external handoff, draft recovery, trust copy, and representative low-cost Android/interruption scenarios with local participants. Validate taxonomy and alert tolerance before expansion.

**Gate:** agreed task-success signal (proposed ≥8/10 participants recover correctly), accessibility triage, owner-approved rules/notices.

### Phase 4 — Runtime and optimization proof

Run provider sandbox, staging Terraform plan, load, large-file, notification, restore, and device/browser tests. Optimize only measured bottlenecks.

**Gate:** NFR evidence or signed exceptions; no runtime claim based on static code alone.

### Phase 5 — Closed beta / release candidate

Small invited cohort, named support owner, rollback/monitoring, explicit limitations. Re-run CI and deployment verification in actual release environment.

**Gate:** owner sign-off on scope, legal/counsel actions, support, rollback, and evidence register.

---

## 10. Release-gate checklist

- [ ] Dedicated web audit and uncovered-route register completed.
- [ ] Clean install/generation/build/lint/typecheck/test evidence current.
- [ ] Payment idempotency/provider verification and session status/reuse fixes verified.
- [ ] M1–M9 static regressions fixed; M10–M12 runtime gaps closed.
- [ ] Earlier API/DB risks revalidated against current source.
- [ ] Outbox, Karama concurrency, social authorization, feed, media, and seed safety tests pass.
- [ ] Settings/employer/messages/replies/deep links and Saved decision work without dead UI.
- [ ] Arabic/RTL, external handoff, application recovery, accessibility, and representative device tests complete.
- [ ] Infrastructure staging plan, backup/restore, provider, and deployment checks complete.
- [ ] Counsel/support/rollback/owner scope decisions documented.

---

## Appendix A — Historical check register

| Check | Recorded result | Release interpretation |
|---|---|---|
| `pnpm --filter @bay/api test` | 274 tests / 27 suites passed | Historical API baseline only. |
| API coverage | 27.34% statements; 16.11% branches; 20.21% functions; 27.64% lines | Branch-heavy security paths need focused tests. |
| `pnpm --filter @bay/api exec tsc --noEmit` | Failed: missing generated Prisma payload types | Restore generation before type gate. |
| `pnpm lint` | Failed: legacy `__eslintrc` unsupported by flat config | Migrate config; do not bypass. |
| `pnpm type-check` | Failed: root script missing | Add real root task. |
| `pnpm --filter @bay/mobile test` | 224 tests / 20 suites passed | Historical mobile baseline. |
| `pnpm --filter @bay/web test` | 74 tests / 8 suites passed | Historical web baseline, not full route coverage. |
| `SKIP_ENV_VALIDATION=1 pnpm build` | Passed | Explicit env bypass, not production validation. |
| Web dedicated audit | Failed twice; no `web_application.md` | First follow-up. |
| Infrastructure runtime | Not verified | Do not claim deployed health. |

## Appendix B — Track coverage

| Track | Included here | Boundary |
|---|---|---|
| Requirements | Market, competitor, FR/NFR, phased priorities | Product recommendations, not runtime facts. |
| Legal | PDPL, cybercrime, telecom/consumer/tax issues | Counsel required; 13 Nov 2026 snapshot. |
| Mobile | M1–M12 status and source-specific highest findings | Runtime gaps remain; M7–M9 details referenced to source note to avoid misstatement. |
| High severity | Payment/session P0s, mobile, infrastructure | Current controlling verdicts. |
| API/DB | Earlier auth/payment/outbox/Karama/social/feed/media/seed/CI findings | Revalidate against current source. |
| Infrastructure | Static hardcoding/root workflow risks | No runtime verification. |
| Web | Only limited requirements/parity evidence | Dedicated audit absent. |

**Bottom line:** close payment/session blockers and mobile integrity gaps first, then complete the opportunity loop and validate Arabic/mobile/trust behavior with real users. Do not broaden scope, assert market demand, or call the product release-ready while current blockers and missing web/runtime verification remain open.
