# Baydar — Palestinian Market Research Notes (2026)

**Research cut-off:** 13 November 2026  
**Purpose:** identify requirements for an Arabic-first Palestinian professional network without turning fragile market assumptions into product requirements.  
**Labels:** **[PS evidence]** Palestinian primary/local evidence; **[Global evidence]** international standards or measurement; **[Inference]** interpretation of evidence; **[Recommendation]** proposed Baydar decision. Live product pages are evidence of observable functionality, not evidence of adoption, quality, or user preference.

## 1. Market evidence

### 1.1 Connectivity is uneven, interrupted, and geographically specific

- **[PS evidence — current Gaza access]** In Labour Force Survey fieldwork conducted 3 September–31 October 2025, approximately **71%** of people aged 10+ in Gaza accessed the internet at least once: **60% intermittent only**, **11% continuous**, and **29% no internet**. Among respondents, **98%** reported poor coverage, **97%** persistent network disruption, **77%** interruptions or severe mobile-service limitations, and **73%** exposure to danger while trying to access the internet. These are distinct measures; 71% access does not mean 71% reliable access.  
  **Source:** PCBS, Ministry of Telecommunication & Digital Economy, and Telecommunication Regulatory Authority, “Digital Lifeline in Palestine: Between Development Challenges and Strengthening Resilience,” joint release for World Telecommunication and Information Society Day, **17 May 2026**. https://www.pcbs.gov.ps/en/post-details/?postId=26011

- **[PS evidence — coverage is not universal]** The same release reports April 2026 mobile coverage of approximately **96% in central Gaza**, while explicitly saying coverage varies by governorate. It does **not** establish 96% coverage across Gaza, continuous service, a particular network generation, or a usable connection at every covered location.  
  **Source:** PCBS et al., “Digital Lifeline in Palestine,” **17 May 2026**, mobile-network coverage section. https://www.pcbs.gov.ps/en/post-details/?postId=26011

- **[PS evidence — earlier baseline, not a current substitute]** In November–December 2024 survey data, **61%** of people aged 10+ in Gaza reported internet use during the preceding three months and **39%** were unable to access it even once; pre-conflict use was reported as 80%. At the beginning of April 2025, approximately **64%** of the 841 Palestinian-operator mobile towers in Gaza were out of service; pre-conflict 2G coverage had been 98%. The 2024 and 2025 findings provide historical/infrastructure context, not a direct substitute for the later 2025 access survey or April 2026 coverage data.  
  **Source:** PCBS and Ministry of Telecommunication & Digital Economy, “Gaza Fights for a Connection with Life, and Digital Equality is a Right,” joint release for World Telecommunication and Information Society Day, **17 May 2025**. https://www.pcbs.gov.ps/en/post-details/?postId=22663

- **[PS evidence — fixed connectivity is changing]** FTTH subscriptions reached **327,000 in 2025**, up **27%** from 2024, while DSL subscriptions declined. This supports the existence of a growing fixed-fibre segment; it does not justify designing only for fibre, and the release does not make this a Gaza-specific figure.  
  **Source:** PCBS et al., “Digital Lifeline in Palestine,” **17 May 2026**, DSL/FTTH subscription section. https://www.pcbs.gov.ps/en/post-details/?postId=26011

- **[PS evidence reported by global press — 4G]** Reuters reported on **6 January 2026** that Israel approved 4G mobile services for Palestinian operators in the West Bank. This is approval/rollout evidence, not proof of completed deployment, universal West Bank availability, Gaza availability, compatible devices, affordable data, or reliable throughput.  
  **Source:** Reuters, “Israel approves 4G mobile services for Palestinians in West Bank,” **6 January 2026**. https://www.reuters.com/world/middle-east/israel-approves-4g-mobile-services-palestinians-west-bank-2026-01-06/

**[Inference]** Baydar cannot treat “online” as a binary or steady state. Interruption recovery matters more than a nominal network-generation label. West Bank, Gaza, fixed-line, and mobile experiences must not be collapsed into one “Palestinian user” profile.

### 1.2 Devices: mobile priority is supported; device capability remains unknown

- **[PS evidence — ownership]** Smartphone ownership among people aged 10+ was approximately **35% in Gaza** during the three months preceding the 2025 interviews, down from approximately 58% in 2023, and **86% in the West Bank in Q1 2026**. These figures are region- and period-specific and are not a combined Palestinian ownership rate.  
  **Source:** PCBS et al., “Digital Lifeline in Palestine,” **17 May 2026**, smartphone-ownership section. https://www.pcbs.gov.ps/en/post-details/?postId=26011

- **[Global measurement, Palestinian territory estimate]** StatCounter’s page for **October 2026** reports operating-system web-usage shares of **Android 73.29%**, **Windows 15.86%**, and **iOS 8.92%**. This is a directional web-analytics estimate across all platforms, not an official census, a count of unique people, proof of device ownership, or evidence of Android version, memory, storage, screen size, or 4G support.  
  **Source:** StatCounter Global Stats, “Operating System Market Share in Palestinian Territory — October 2026,” **October 2026 data; accessed 13 November 2026**. https://gs.statcounter.com/os-market-share/all/palestinian-territory/2025

**[Inference]** Mobile/Android deserves first-order testing and desktop remains relevant, especially for employers. Neither source proves that every Android device is low-end, that iOS can be ignored, or that a native app is required.

### 1.3 Language and direction: bilingual conventions are visible, preferences are unmeasured

- **[PS product evidence]** Jobs.ps presents Arabic and English navigation/listing conventions. A current listing is titled in both Arabic and English (“مدير مشاريع | Project Manager”), while much of its structured content is Arabic. This supports accommodating mixed-language recruitment content; it does not measure the preferred interface language of Palestinian professionals.  
  **Source:** Jobs.ps, “مدير مشاريع | Project Manager - جوبس,” listing posted **12 November 2026; accessed 13 November 2026**. https://www.jobs.ps/jobs/project-manager-69920  
  **Source:** Jobs.ps, “وظائف شاغرة في فلسطين - وظائف فلسطين - جوبس,” live homepage, **accessed 13 November 2026**. https://www.jobs.ps/

- **[Global evidence — RTL implementation]** W3C instructs authors to put `dir="rtl"` on the HTML element for an RTL document, declare the language separately with `lang`, avoid using CSS alone to establish base direction, and use logical start/end CSS properties. It also recommends `dir="auto"` for suitable runtime/user-provided text and handling inline bidirectional text separately.  
  **Source:** W3C Internationalization, “Structural markup and right-to-left text in HTML,” first published 12 August 2011; substantive update **25 June 2021**, latest edit **10 May 2026**. https://www.w3.org/International/questions/qa-html-dir

**[Inference]** Arabic-first should mean complete, coherent Arabic journeys—not an Arabic shell around English-only forms, errors, or recruitment workflows. English acronyms, company names, email addresses, URLs, dates, and numerals still require deliberate bidirectional-text handling. Modern Standard Arabic versus dialect, and the desired amount of English, remain research questions rather than established facts.

### 1.4 Recruitment: high job-search relevance and concrete local workflow precedents

- **[PS evidence — West Bank only]** In **Q3 2026**, the West Bank unemployment rate among labour-force participants aged 15+ was **28.1%** under ICLS-19. Among West Bank youth graduates aged **19–29** with an intermediate diploma or higher, unemployment was **44.0%**: 24.1% for males and 58.5% for females. These figures must not be presented as all-Palestine or Gaza rates.  
  **Source:** PCBS, “The Results of the Labour Force Survey Third Quarter in the West Bank (July–September, 2026) Round,” **11 November 2026**. https://www.pcbs.gov.ps/en/post-details/?postId=27412

- **[PS evidence — employment terms]** The same Q3 2026 West Bank release reports that **37.6%** of private-sector wage employees had no employment contract and **13.2%** received less than the stated monthly minimum-wage level. This supports making employment terms visible, but does not by itself prove which job-platform fields users value or establish wrongdoing by any particular advertiser.  
  **Source:** PCBS, “The Results of the Labour Force Survey Third Quarter in the West Bank,” **11 November 2026**, employment-contract and wage sections. https://www.pcbs.gov.ps/en/post-details/?postId=27412

- **[PS product evidence — discovery and account workflow]** Jobs.ps visibly provides keyword and geographic/category discovery, job-seeker and employer areas, employer profiles, CV upload, social-login options, and email/SMS job alerts. These are competitor feature observations, not independent evidence that all are effective or required.  
  **Source:** Jobs.ps, live homepage and linked product flows, **accessed 13 November 2026**. https://www.jobs.ps/

- **[PS product evidence — listing and application structure]** The sampled current listing exposes a deadline, location, full-time employment type, category, seniority, education, experience, an employer page, external-email application, and save/report/share actions. Its structured salary is “N/A,” which demonstrates that salary can be absent; one listing cannot establish a market-wide salary-disclosure norm.  
  **Source:** Jobs.ps, “مدير مشاريع | Project Manager - جوبس,” posted **12 November 2026; accessed 13 November 2026**. https://www.jobs.ps/jobs/project-manager-69920

**[Inference]** Baydar’s recruitment baseline should prioritize finding relevant opportunities and completing an application under interruption, not social-feed volume. Location, deadline, employment type, clear requirements, employer identity, CV handling, saved opportunities, and recoverable application state are closer to core utility than speculative monetization.

### 1.5 Trust, safety, and accessibility

- **[PS evidence — access safety]** The 73% danger-while-accessing-internet finding is evidence of physical/digital-access risk in Gaza; it is not a measured rate of online fraud or harassment. It nevertheless argues against product flows that require prolonged sessions or repeated attempts and for careful handling of identity and contact information.  
  **Source:** PCBS et al., “Digital Lifeline in Palestine,” **17 May 2026**, difficulties-using-internet section. https://www.pcbs.gov.ps/en/post-details/?postId=26011

- **[PS product evidence — user controls]** The sampled Jobs.ps listing includes report, save, and share actions, showing a local precedent for opportunity-level controls. It does not establish the site’s verification or moderation process.  
  **Source:** Jobs.ps, Project Manager listing, **12 November 2026; accessed 13 November 2026**. https://www.jobs.ps/jobs/project-manager-69920

- **[Global evidence — accessibility]** WCAG 2.2 is a W3C Recommendation containing testable, technology-independent accessibility criteria for web content across desktop and mobile devices. W3C also cautions that it does not address every user need, so conformance checks do not replace testing with disabled users.  
  **Source:** W3C, “Web Content Accessibility Guidelines (WCAG) 2.2,” **W3C Recommendation, 12 December 2024**. https://www.w3.org/TR/WCAG22/

**[Inference]** Trust must combine product controls, visible verification state, moderation operations, privacy, and accessible recovery paths. A badge alone is not verification, WCAG conformance alone is not usability, and the access-safety statistic must not be repurposed as an online-scam statistic.

### 1.6 Payments and monetization: no supported local requirement yet

This research found no current primary evidence establishing Palestinian users’ preferred payment methods, willingness to pay, employer subscription demand, currency expectations, provider coverage, or applicable payment/tax requirements. That is a research gap—not evidence that payments are unwanted. Core networking and job application flows do not need a payment assumption.

## 2. Product implications and priorities

### 2.1 Must-have for the core product

| Area | **[Recommendation] Core requirement** | Evidence boundary |
|---|---|---|
| Interrupted connectivity | Keep pages and media light; make loading, offline, failure, and pending states explicit; preserve entered profile/application text; make retries safe and non-duplicating; resume interrupted uploads where supported; let users revisit already fetched content without a fresh request. | Driven by intermittent/disrupted access evidence, not by an assumption of universal low bandwidth. |
| Time-efficient flows | Minimize required steps, avoid repeated authentication during one task, show deadlines before application, and never silently discard work after timeout or reconnect. | Especially relevant where access can be difficult or risky; exact performance budgets still require field measurement. |
| Device coverage | Provide responsive mobile web journeys and usable desktop employer workflows; test representative Android devices and browsers without excluding iOS or desktop; avoid native-only dependencies for essential tasks. | OS shares are directional. Build the test matrix from observed users, not from “all devices are cheap/old.” |
| Arabic-first UX | Complete Arabic navigation, forms, validation, errors, notifications, help, and recruitment flows; correct `lang`/base `dir`; logical layout; mixed-direction isolation for user text, names, email, URLs, and numerals; Arabic and English job content where supplied. | W3C supports implementation; local pages support bilingual content conventions. Dialect/tone still needs testing. |
| Job discovery | Search plus location/governorate, category, employment type, experience/seniority, and remote/on-site filters; structured location, deadline, education, experience, responsibilities, and application method; clear expired/closed states. | Local listing precedent plus recruitment inference. Remote-work demand and exact filter taxonomy need validation. |
| Applications | CV/profile attachment, external-application option, draft preservation, explicit submission confirmation, and a user-visible record of submitted applications. | CV/external application have local precedent; draft/recovery is a connectivity inference. |
| Opportunity controls | Save, share, report, employer profile, and alerts through channels users can actually receive. | Save/share/report have local precedent; alert-channel preference is not established. |
| Trust and privacy | Secure sign-in and recovery without social-login lock-in; accurate employer verification states; report/block controls with an owned moderation process; consent before exposing contact details; clear visibility controls and account/data deletion/export paths. | Product/security baseline and inference. Verification policy and legal retention/deletion duties require specialist review. |
| Accessibility | Target **WCAG 2.2 AA**: keyboard operation, visible focus, labelled fields and actionable errors, sufficient contrast, zoom/reflow, appropriate target size, accessible dialogs, and screen-reader testing in RTL and mixed-direction content. | Global standard; not a claim of legal certification or a substitute for disabled-user testing. |

### 2.2 Optional after the core works

- **Full English interface:** support English content now; expand the entire interface after Arabic-first journeys are complete and bilingual demand is tested.
- **Richer native-only capabilities:** add only when a measured user need exceeds what resilient mobile web can provide; do not make installation a prerequisite for core value.
- **Additional alert channels:** SMS or other channels are optional additions after reach, cost, consent, delivery reliability, and unsubscribe behaviour are validated.
- **Paid employer services or subscriptions:** defer until a monetization study and legal/provider review exist. Do not add consumer payments merely because a professional network may eventually monetize.
- **Elaborate reputation scores or automated “trust scores”:** defer. Start with explainable identity states and human-accountable reporting rather than opaque scoring.

### 2.3 Validate before committing to a build or launch decision

- The exact offline/cache scope and acceptable data staleness, especially for applications and private messages.
- Device/browser/version, storage, memory, and assistive-technology test coverage by actual Baydar audience.
- Arabic terminology, dialect versus Modern Standard Arabic, English mixing, and numerals/date conventions in real tasks.
- Whether employers require verification documents, how job seekers interpret verification, and what moderation response is operationally feasible.
- Salary fields, remote/hybrid categories, and employment-contract disclosures; current evidence does not set these norms.
- Notification channel preferences and delivery economics before SMS or another paid channel.
- Palestinian privacy, employment, consumer, electronic-transaction, content, hosting/cross-border-transfer, and payment obligations with qualified counsel; this document makes no legal determination.
- Payment methods, currencies, invoicing/tax, refunds, provider availability, fees, and employer willingness to pay before any monetization work.

## 3. Research gaps and validation plan

| Gap | Decision currently at risk | Required validation / useful output |
|---|---|---|
| No first-hand Baydar user research | Feature priority and workflow assumptions | Separately recruit West Bank and Gaza participants, job seekers, employers/recruiters, and disabled users. Run interviews plus moderated tasks on finding a job, saving it, applying, recovering after interruption, reporting a concern, and deleting/exporting data. Treat qualitative findings as insight, not prevalence statistics. |
| No audience device telemetry | Minimum supported versions and performance budget | With informed consent, measure actual browser/OS/version, viewport, device capability, failures, and core-task completion; combine analytics with hands-on testing on representative physical devices. |
| No comparable operator/region performance study | Timeout, retry, media, and offline design | Test core journeys under measured latency, packet loss, disconnects, and real operator conditions. Record West Bank/Gaza and Wi-Fi/mobile results separately. Use safe remote/local research arrangements in Gaza; never ask participants to endanger themselves for a test. |
| No language-preference or comprehension study | Arabic-first content system and bilingual scope | Test Arabic terminology and tone in context, including mixed Arabic/English job titles, dates, numbers, errors, and screen readers. Revise from observed comprehension rather than stereotypes about formality or literacy. |
| Thin competitor sample | Which workflows are expected versus merely available | Review a broader, dated set of current local and regional recruitment products and several listings. Record fields, application routes, verification, alerts, accessibility, and failure recovery; do not infer market share or effectiveness from feature presence. |
| Employer operations unknown | Verification, listing moderation, application management, and service levels | Interview employers/recruiters of different sizes and sectors; document identity evidence, listing approval, spam/scam handling, applicant communication, moderation staffing, and takedown/appeal expectations. |
| Accessibility untested with users | WCAG target versus actual task usability | Audit Arabic/RTL and mixed-direction flows with keyboard and screen readers, then conduct paid usability sessions with disabled Palestinian users across relevant access needs. |
| No legal review | Data collection, verification, messaging, retention, deletion, hosting, and payments | Obtain qualified Palestinian legal advice for the actual data map and operating model. Record obligations, open interpretations, owner, and review date; do not treat this research note as legal advice. |
| No payment/monetization research | Whether, when, and how to charge | Interview employers and separately test job-seeker expectations; verify providers directly and obtain legal/accounting advice on currency, invoices, tax, refunds, fees, and cross-border operation. Keep payments out of the critical application path meanwhile. |
| Fast-changing connectivity and labour conditions | Research becoming stale or overgeneralized | Date every analytics snapshot, retain geographic/denominator labels, refresh official PCBS/operator evidence before major releases, and do not convert a coverage or approval announcement into an availability claim without field confirmation. |

### Claims to avoid until new evidence exists

- “Palestine has universal 4G,” “96% of Gaza has reliable coverage,” or “all users have modern smartphones.”
- “73.29% of Palestinians own Android devices” or “all Palestinian Android devices are low-end.” StatCounter reports web-usage share, not ownership or capability.
- “Only 39% of Gaza used the internet in late 2024.” The cited PCBS release says **61% used it; 39% could not access it even once** during the reference period.
- “28.1% unemployment across Palestine.” The cited Q3 2026 rate is for the **West Bank**, as is the 44.0% youth-graduate rate.
- “Palestinians prefer Arabic only,” a particular dialect, salary secrecy, a payment wallet, or paid subscriptions.
- “Baydar is legally compliant,” “WCAG certified,” or “employers are verified” without the corresponding legal review, accessibility audit, or operational verification process.
- Market-size, adoption, scam-prevalence, connectivity-speed, or willingness-to-pay figures not directly supported by a named source and denominator.
