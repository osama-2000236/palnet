# Baydar requirements, implementation traceability, and cleanup audit

**Audit date:** 2026-11-13  
**Basis:** the current, already-dirty working tree, including uncommitted and untracked implementation files.  
**Mode:** read-only source/document audit. No application source, documentation, dependency, or git state was changed; the only file created is this report.

## 1. Executive decision summary

1. `project-spec.md` is the current product baseline and explicitly wins over older sprint documents (`project-spec.md:1-3`). `DESIGN.md` wins visual and interaction conflicts (`DESIGN.md:1-5`). Dated audits, handoffs, and implementation-complete records are evidence about their snapshots, not new requirements.
2. Most core MVP requirements have identifiable implementation and contract evidence. **Traced does not mean runtime-verified**: this audit did not execute the application or its test gates.
3. The largest requirements conflict is that premium subscriptions/billing and recruiter workspace are deferred (`project-spec.md:86-92`) while billing, companies, Karama, and ratings modules are registered (`apps/api/src/app.module.ts:12-19,27,70-73`) and employer clients exist (`apps/web/src/app/[locale]/(app)/employer/page.tsx:28-44`; `apps/mobile/app/(app)/employer/index.tsx:28-38`). This needs an explicit product-scope decision, not an unattended deletion.
4. Web renders Saved and Employer navigation items (`packages/ui-web/src/AppShell.tsx:114-126`), but the host navigation handler has no `saved` or `employer` case (`apps/web/src/app/[locale]/(app)/layout.tsx:216-240`). Saved also has no destination route or API implementation in the searched working tree; only an unexported schema and navigation/design references were found (`packages/shared/src/schemas/bookmark.ts:1-38`; `packages/shared/src/index.ts:1-22`).
5. The only unconditional cleanup candidates in this report are **ignored, regenerable local outputs**. The dated design handoff is not a disposable duplicate: its prototype has an archived twin, but its code mirror differs substantially and active scripts/references still target it (`scripts/capture-snapshots.mjs:15`; `AGENTS.md:24-27`; `.vercelignore:16`). Retain and mark/index it as historical, or archive it only with reference updates.

## 2. Corpus coverage and evidence rules

### 2.1 Authorities and records reviewed

| Corpus | How it was used |
| --- | --- |
| Product baseline, locked stack, feature surface, Definition of Done, and deferred scope (`project-spec.md:1-3,13-45,52-76,86-92`) | Current requirements and acceptance baseline. |
| Visual authority, design constraints, component inventory, and navigation rules (`DESIGN.md:1-5,27-56`; `docs/design/NAV.md:1-40,58-60`) | Current design and navigation requirements. |
| Current-state handoff, follow-ups, and verification snapshot (`docs/HANDOFF.md:5-25,54-83`) | Cross-checked against the dirty tree rather than copied as current fact. |
| API contract (`docs/api-contract.md:1-29,31-66,172-209`) | Compared with representative live controllers and module registration. |
| Dated product-health and design-request records (`docs/design/PRODUCT-HEALTH-2026-05-16.md:1-16,56-75,127-148`; `docs/design/HANDOFF-TO-DESIGN-2026-05-16.md:1-28,85-105`) | Historical gaps and **unapproved proposals**, not current requirements. |
| Actual May handoff (`design-handoff-2026-05/00-README.md:1-18,33-41`; `design-handoff-2026-05/STATUS.md:1-35`; `design-handoff-2026-05/IMPLEMENTATION_COMPLETE.md:1-30,32-76`) | Dated input snapshot and historical implementation evidence. The actual corpus is `design-handoff-2026-05/`; no `design-handoff-2026-01/` directory was present in the inspected root. |
| Cleanup policy and prior cleanup record (`README.md:80-91`; `docs/repo-cleanup-2026-04-28.md:1-22,50-68`) | Cleanup precedent only; old branch/worktree lists were not treated as a current inventory. |
| Targeted live implementation in API, web, mobile, shared schemas, tokens, UI packages, package scripts, and ignore/build configuration | Current traceability and reference-search evidence. Representative citations appear below. |

### 2.2 Searches and comparisons performed

- Tracked and untracked reference searches covered billing, employer/companies, saved/bookmarks, Yup, Resend, retention, profile routes, generated-output references, and handoff references.
- SHA-256 comparisons covered every file under `design-handoff-2026-05/code/` against the same relative working-tree path, and all 12 files under `design-handoff-2026-05/05-prototype/` against `docs/_archive/prototype-2025/`. The archived prototype is explicitly a design authority (`project-spec.md:11`).
- Physical line counts were measured for the current dirty route/components identified during the handoff review. The 300-line rule comes from `AGENTS.md:10-19`.
- Ignore status and file/byte counts were measured for existing local build/test output. Ignore rules are repository evidence (`.gitignore:9-17,45-51`), not proof that a directory is safe to delete while a process is using it.

### 2.3 Exclusions and limits

- This was not another line-by-line audit of every application screen, API service, database model, infrastructure file, or test. Findings are limited to the traceability seams and cleanup candidates examined.
- Dependency folders and the contents of generated `.next/`, `.expo/`, `coverage/`, and `dist/` files were not manually reviewed; only metadata, ignore rules, references, and regenerability were assessed. These paths are classified as build/test output by `.gitignore:9-17,45-49` and `turbo.json:5-7,21-23`.
- Handoff screenshots and binary images were inventory/hash inputs, not a fresh visual QA pass. The dated snapshot record itself says mobile snapshots remained a human gap (`design-handoff-2026-05/STATUS.md:18-21,28-37`).
- Historical command results were not treated as current results. For example, the handoff's passing gate is tied to its implementation tree and commits (`design-handoff-2026-05/IMPLEMENTATION_COMPLETE.md:3-6,32-46`).
- No secrets were read, no packages were installed, no files were deleted, no branches/worktrees were changed, and no GitHub issue or external service was mutated.

### 2.4 Status vocabulary

- **Traced:** requirement and implementation/contract evidence meet; runtime correctness remains unverified.
- **Partial:** implementation exists, but documentation, navigation, acceptance, or verification is incomplete.
- **Scope conflict:** deferred/omitted baseline scope conflicts with live implementation.
- **Proposal:** dated design/product suggestion without evidence of baseline approval.
- **Maintenance risk:** current structure increases drift or change cost but is not, by itself, proof of a user-facing defect.

## 3. Requirements-to-implementation matrix

| ID | Requirement and authority | Implementation evidence | Status | Acceptance / remaining gap |
| --- | --- | --- | --- | --- |
| R-01 | Arabic-first `ar-PS`, English fallback, RTL, token-led design (`project-spec.md:7-11,35-45`; `DESIGN.md:47-56`) | Locale and direction are applied at the root (`apps/web/src/app/layout.tsx:30-40`); web imports canonical tokens (`apps/web/src/app/globals.css:21-30`); focus, spacing, semantic, and avatar tokens exist (`packages/ui-tokens/src/tokens.css:48-99`). | **Traced** | Arabic-first copy, English fallback, relevant tests, and gates remain required (`project-spec.md:66-76`). Native-speaker copy review remains a documented launch task (`docs/HANDOFF.md:56-63`). |
| R-02 | Next 15/React 19 web; Expo 54/RN 0.81 mobile; pnpm/Turborepo (`project-spec.md:13-31`) | Web dependencies match Next 15/React 19 (`apps/web/package.json:18-33`); mobile uses Expo 54, Expo Router 6, and RN 0.81 (`apps/mobile/package.json:31-56`). | **Partial — guidance drift** | `AGENTS.md:3-8` still says Expo 51 and `AGENTS.md:19-20` names a non-existent root `typecheck` script; the actual script is `type-check` (`package.json:11-18`). |
| R-03 | Nest modular monolith, `/api/v1`, Swagger, SSE, Prisma through `@baydar/db`, shared Zod contracts (`project-spec.md:35-45`) | API modules are composed in one root module (`apps/api/src/app.module.ts:37-75`); REST/SSE conventions and shared schemas are contracted (`docs/api-contract.md:1-13`); representative controllers validate with shared Zod (`apps/api/src/modules/billing/billing.controller.ts:28-53`). | **Partial** | Contract omits several registered/live surfaces; see CM-03. Swagger and runtime routes were not exercised. |
| R-04 | Auth, email verification/recovery, account export/delete/restore, SSE hardening (`docs/HANDOFF.md:21-25`; `docs/api-contract.md:37-66`) | Resend is selected when configured and required in production (`apps/api/src/modules/mail/mail.module.ts:14-32`); retention hard-deletes expired soft-deletes (`apps/api/src/modules/account/account-retention.service.ts:19-48`) with a named expiry test (`apps/api/src/modules/account/account-retention.service.spec.ts:47`). | **Traced — stale follow-ups** | `docs/HANDOFF.md:62-65` still lists real email and hard-delete as future work. Production delivery and scheduled execution were not verified. |
| R-05 | Registration/login, onboarding/editing, public profiles (`project-spec.md:56-57`) | `/me` resolves the current profile and redirects to `/in/[handle]` (`apps/web/src/app/[locale]/(app)/me/page.tsx:15-32`); web employer/profile and mobile hidden profile routes are registered (`apps/mobile/app/(app)/_layout.tsx:303-315`). | **Traced — route-doc drift** | `DESIGN.md:195` still names `/u/[handle]`; current implementation and API contract use `/in/[handle]` (`apps/web/src/app/[locale]/(app)/me/page.tsx:25-32`; `docs/api-contract.md:68-72`). |
| R-06 | Feed, posts, reactions, comments, reposts, media upload (`project-spec.md:58`) | Feed/post/interaction endpoints and media validation are contracted (`docs/api-contract.md:83-115`); corresponding modules are registered (`apps/api/src/app.module.ts:58-66`). | **Traced** | No fresh endpoint, media-provider, or UI smoke test was run. Blurhash remains an API placeholder by contract (`docs/api-contract.md:98-115`). |
| R-07 | Connections, requests/suggestions, blocking primitives (`project-spec.md:59`) | Connection endpoints (`docs/api-contract.md:74-81`) and report/block behavior (`docs/api-contract.md:117-134`) are specified; modules are registered (`apps/api/src/app.module.ts:63-64`). | **Traced** | Ownership, failure paths, and UI evidence remain subject to the DoD (`project-spec.md:70-76`), not re-executed here. |
| R-08 | Direct messages, read/typing/archive, SSE (`project-spec.md:60`) | Messaging and stream contracts are present (`docs/api-contract.md:136-155`); web subscribes to message events and coalesces unread refreshes (`apps/web/src/app/[locale]/(app)/layout.tsx:114-161`). | **Traced** | Real-device resume and cross-device messaging remain manual evidence gaps (`docs/HANDOFF.md:54-59`). |
| R-09 | Notifications, device tokens, Expo push (`project-spec.md:61`) | Notification/SSE/device contract exists (`docs/api-contract.md:157-170`); preference endpoints are live (`apps/api/src/modules/notifications/preferences.controller.ts:13-32`) and consumed by web (`apps/web/src/app/[locale]/(app)/settings/notifications/page.tsx:78-95`). | **Partial** | Preference routes are absent from the API contract; push/deep-link behavior still needs device evidence (`docs/HANDOFF.md:54-59`). |
| R-10 | Jobs list/detail/apply with cover letter (`project-spec.md:62`) | Jobs contract describes current list/detail/apply behavior (`docs/api-contract.md:172-178`); jobs module is registered (`apps/api/src/app.module.ts:69`). | **Traced for jobs** | Employer/company management is a separate scope conflict below, not implicitly approved by the jobs requirement. |
| R-11 | People/post/job search; companies search deferred until company administration ships (`docs/HANDOFF.md:20`; `docs/api-contract.md:180-186`) | Search module is registered (`apps/api/src/app.module.ts:65`) and search routes are contracted (`docs/api-contract.md:180-186`). | **Partial — stale precondition** | Company administration now exists (`apps/api/src/modules/companies/companies.controller.ts:31-78`), so the stated precondition no longer proves companies search should remain deferred. Product must decide search scope; this audit did not approve it. |
| R-12 | Mobile deep links, offline, haptics, refresh/recovery; focused tabs and hidden detail routes (`project-spec.md:64`; `docs/design/NAV.md:33-49`) | Five visible tabs and hidden routes are registered (`apps/mobile/app/(app)/_layout.tsx:237-317`); mobile employer calls `/companies/me` (`apps/mobile/app/(app)/employer/index.tsx:28-38`). | **Partial** | Device evidence remains open and several current route files exceed the 300-line maintenance cap; see MR-01 and VG-01. |
| R-13 | Karama and ratings are implemented product surfaces but absent from the current feature list (`project-spec.md:52-64`) | Modules are registered (`apps/api/src/app.module.ts:19,27,72-73`), shared schemas are exported (`packages/shared/src/index.ts:20-21`), and Karama exposes balance/redeem (`apps/api/src/modules/karama/karama.controller.ts:11-29`). | **Scope/documentation gap** | Baseline must classify them as approved, experimental, or removable. Earning/redemption/decay, abuse, and parity acceptance need an owner-approved reference. |
| R-14 | Premium subscriptions, billing, ads, and recruiter workspace are deferred until explicitly approved (`project-spec.md:86-92`) | Billing checkout, invoices, bank transfer, and HyperPay webhook endpoints exist (`apps/api/src/modules/billing/billing.controller.ts:23-71`); company CRUD and employer web/mobile clients exist (`apps/api/src/modules/companies/companies.controller.ts:31-78`; `apps/web/src/app/[locale]/(app)/employer/page.tsx:28-44`; `apps/mobile/app/(app)/employer/index.tsx:28-38`). | **Scope conflict** | Owner must retain/approve, disable, or schedule removal. Do not infer deletion approval from the stale baseline. |
| R-15 | Saved/bookmarks is a dated design request, not part of the accepted feature list (`project-spec.md:52-64`; `docs/design/HANDOFF-TO-DESIGN-2026-05-16.md:19-28`) | Web Saved navigation is visible (`packages/ui-web/src/AppShell.tsx:114-126`) and localized (`apps/web/src/app/[locale]/(app)/useAppShellLabels.ts:18-35`), but its host handler has no Saved case (`apps/web/src/app/[locale]/(app)/layout.tsx:216-240`). A standalone schema exists but is not exported (`packages/shared/src/schemas/bookmark.ts:1-38`; `packages/shared/src/index.ts:1-22`). | **Proposal + incomplete implementation** | No saved route, API controller/service, Prisma bookmark model, or schema import was found in repository-wide tracked/untracked searches. Decide whether to hide/remove the affordance or approve and implement the feature. |
| R-16 | Feature DoD: migrations/contracts/tests/i18n/gates/docs (`project-spec.md:66-76`) | Root gates use `build`, `lint`, `type-check`, and `test` (`package.json:11-18`); package test/build tasks declare generated outputs (`turbo.json:5-7,17-23`). | **Verification gap** | This audit did not run gates. The handoff's “285 tests” and expected passing state are historical assertions (`docs/HANDOFF.md:46-52,69-83`), not current proof. |

## 4. Confirmed mismatches, ranked

### CM-01 — P1: deferred scope conflicts with live billing/employer functionality

- **Evidence:** deferred premium/billing/recruiter scope (`project-spec.md:86-92`) versus registered billing/companies modules (`apps/api/src/app.module.ts:12-14,70-72`), live payment endpoints (`apps/api/src/modules/billing/billing.controller.ts:23-71`), and employer clients (`apps/web/src/app/[locale]/(app)/employer/page.tsx:28-44`; `apps/mobile/app/(app)/employer/index.tsx:28-38`).
- **Risk:** release scope, payment obligations, maintenance ownership, and API promises are ambiguous. Blind removal could delete live payment/company behavior and data paths.
- **Minimal action:** record one owner decision for billing and one for employer/recruiter scope. If retained, update `project-spec.md`, navigation, API contract, and acceptance criteria together. If rejected, plan migration/data handling and client/API removal as a reviewed feature change.
- **Acceptance:** every retained surface is listed as approved; every rejected surface has an explicit disable/migration/removal plan. No payment or company endpoint is deleted solely to satisfy the old document.

### CM-02 — P1: rendered Saved and Employer web navigation has no navigation handler cases

- **Evidence:** both route keys and visible items exist (`packages/ui-web/src/AppShell.tsx:40-48,114-126`), path highlighting recognizes both (`apps/web/src/app/[locale]/(app)/layoutState.ts:11-22`), but `onNavigate` handles only feed/network/jobs/messages/notifications/profile (`apps/web/src/app/[locale]/(app)/layout.tsx:216-240`).
- **Impact:** activating either rendered item reaches no host navigation branch. Saved additionally lacks a destination and API; Employer destinations do exist (`apps/mobile/app/(app)/_layout.tsx:313-315`; `apps/web/src/app/[locale]/(app)/employer/page.tsx:18-44`).
- **Minimal action:** after CM-01/R-15 scope decisions, either hide unauthorized/incomplete items or add the two handler branches and destination tests. Do not add a Saved branch to a non-existent page.
- **Acceptance:** every visible `NAV_ITEMS` key has a working destination, keyboard activation test, active-state test, and Arabic/English label; no visible item targets an unimplemented route.

### CM-03 — P1: API contract is incomplete and contains stale company-admin guidance

- **Evidence:** the contract ends its core inventory with jobs/search and still calls company-admin endpoints planned (`docs/api-contract.md:172-186`). Live but undocumented surfaces include billing (`apps/api/src/modules/billing/billing.controller.ts:23-71`), companies (`apps/api/src/modules/companies/companies.controller.ts:31-78`), Karama (`apps/api/src/modules/karama/karama.controller.ts:11-29`), and notification preferences (`apps/api/src/modules/notifications/preferences.controller.ts:13-32`).
- **Minimal action:** document retained routes, envelopes, auth/roles, rate limits, errors, and shared schemas. Resolve CM-01 first for billing/employer so the contract does not convert accidental scope into approval.
- **Acceptance:** controller inventory and contract agree for retained public/client routes; `/search/companies` has an explicit current decision replacing the stale precondition (`docs/api-contract.md:180-186`).

### CM-04 — P2: contributor commands and stack guidance are stale

- **Evidence:** Expo 51 in `AGENTS.md:3-8` versus Expo 54/RN 0.81 in `project-spec.md:20-22` and `apps/mobile/package.json:31-56`; `pnpm typecheck` in `AGENTS.md:19-20` versus root `type-check` in `package.json:17` and `docs/HANDOFF.md:71-81`.
- **Minimal action:** change only the stale SDK/version and command references; keep `project-spec.md` as the authority.
- **Acceptance:** a new contributor can copy the documented root command without pnpm reporting a missing script, and all current stack references agree.

### CM-05 — P2: design route/file references do not match current web structure

- **Evidence:** `DESIGN.md:195` names `/u/[handle]`, while `/me` redirects to `/in/[handle]` (`apps/web/src/app/[locale]/(app)/me/page.tsx:25-32`). `DESIGN.md:102` names `apps/web/app/layout.tsx`; actual font loading is in `apps/web/src/app/layout.tsx:1-3,16-28` and locale layout is under `apps/web/src/app/[locale]/layout.tsx:21-40`.
- **Minimal action:** update the design references without changing the implemented public route.
- **Acceptance:** profile route and font-layout links resolve to current source and agree with the API/profile contract (`docs/api-contract.md:68-72`).

### CM-06 — P2: current handoff follow-ups incorrectly list completed Resend and retention work as open

- **Evidence:** `docs/HANDOFF.md:62-65` says real email and hard-delete remain follow-ups; Resend production selection is implemented (`apps/api/src/modules/mail/mail.module.ts:14-32`) and retention deletes expired users (`apps/api/src/modules/account/account-retention.service.ts:19-48`).
- **Minimal action:** mark implementation complete while preserving separate operational verification: provider credentials/delivery and scheduler execution are not proven by source alone.
- **Acceptance:** handoff distinguishes “code exists,” “deployed/configured,” and “verified operating.” It does not reclose manual device, Arabic, legal, or release-environment tasks (`docs/HANDOFF.md:54-65`).

## 5. Maintenance risks

### MR-01 — P2: current pages/components still exceed the 300-line cap

The rule applies to pages/components (`AGENTS.md:10-19`). Counts below are from the current dirty tree, not the historical sizes in `docs/design/PRODUCT-HEALTH-2026-05-16.md:99-123`.

| Current file | Lines | Evidence |
| --- | ---: | --- |
| Mobile authenticated tab layout | 403 | `apps/mobile/app/(app)/_layout.tsx:403` |
| Mobile message room | 333 | `apps/mobile/app/(app)/messages/[roomId].tsx:315-333` |
| Mobile onboarding | 439 | `apps/mobile/app/(app)/onboarding.tsx:420-439` |
| Mobile network | 353 | `apps/mobile/app/(app)/network.tsx:340-353` |
| Mobile notification settings | 315 | `apps/mobile/app/(app)/settings/notifications.tsx:290-315` |
| Web AppShell atom | 500 | `packages/ui-web/src/AppShell.tsx:485-500` |
| Web Composer atom | 330 | `packages/ui-web/src/Composer.tsx:315-330` |

**Minimal action:** split along existing state/section boundaries without changing behavior. Do not split API services merely because they exceed 300 lines; the cited rule is for pages/components.  
**Acceptance:** all pages/components are at or below 300 physical lines, existing tests pass, and navigation/form/message behavior has focused regression evidence. Historical claims that web app routes are all below the cap (`design-handoff-2026-05/IMPLEMENTATION_COMPLETE.md:21-30`) must not be generalized to current mobile routes or shared atoms.

### MR-02 — P2: mobile maintains parallel Yup and shared-Zod validation paths

- **Evidence:** Yup is a live dependency (`apps/mobile/package.json:54-67`) with imports in login (`apps/mobile/app/(auth)/login.tsx:8,25-27`), register (`apps/mobile/app/(auth)/register.tsx:8,27-47`), forgot/reset (`apps/mobile/app/(auth)/forgot-password.tsx:6,16-17`; `apps/mobile/app/(auth)/reset-password/[token].tsx:6,16-26`), and onboarding (`apps/mobile/src/components/onboarding/schema.ts:1-7`). Shared DTO/request validation is meant to originate in `@baydar/shared` (`project-spec.md:40-44`).
- **Classification:** maintenance risk, not authorization to remove Yup. Five live source import sites were found in tracked plus untracked searches.
- **Minimal action:** only if the team chooses one client-validation convention, migrate each form with equivalent localization and invalid-input tests, then remove the dependency and lockfile entries in that same reviewed change.
- **Acceptance:** no runtime Yup imports remain, form messages and validation boundaries are unchanged, mobile tests/type-check pass, and dependency removal follows the imports—not the reverse.

### MR-03 — P2: the design handoff is neither synchronized source nor an exact duplicate

Hash comparison of `design-handoff-2026-05/code/` found **21 files: 3 identical, 16 different, and 2 without working-tree counterparts**. This is consistent with a dated input snapshot, not a safe deletion-by-duplicate candidate.

- Identical: `apps/web/src/app/globals.css`, `apps/web/src/app/[locale]/(app)/messages/new/page.tsx`, and `apps/web/src/app/[locale]/(auth)/login/LoginForm.tsx` under the handoff `code/` mirror.
- Different: handoff copies of root/app error, not-found, loading, landing, jobs, me, notification/privacy/security settings, register, tokens.css, Alert, Chip, Input, and ui-web index.
- No same-path counterpart: `packages/ui-tokens/src/tokens.additions.css` and `packages/ui-web/src/index.additions.ts`.
- All 12 files in `design-handoff-2026-05/05-prototype/` are byte-identical to `docs/_archive/prototype-2025/`; the archive remains explicitly authoritative (`project-spec.md:11`).
- Active references prevent casual relocation: contributor guidance points to the code mirror (`AGENTS.md:24-27`), snapshot capture writes into the handoff (`scripts/capture-snapshots.mjs:15`), and deployment exclusion names it (`.vercelignore:16`). Current source comments also point to non-existent handoff-relative `PRODUCT-HEALTH.md` (`apps/web/src/app/[locale]/(app)/settings/notifications/page.tsx:3-6`), while the actual reviewed report is `docs/design/PRODUCT-HEALTH-2026-05-16.md:1-16`.

**Minimal action:** retain in place and label/index it as a dated, read-only snapshot. Repair live source comments to existing records. If later moving it under `docs/_archive/`, update the agent guidance, capture output path, deployment exclude, and comments atomically.  
**Acceptance:** no live reference breaks; current source is never overwritten from the mirror; duplicate prototype hashes may be rechecked, but neither authoritative archive nor handoff history is deleted merely for being identical.

### MR-04 — P2: historical findings need closure context so they are not reopened as current work

- Token duplication and absent resilience screens were current in the dated health report (`docs/design/PRODUCT-HEALTH-2026-05-16.md:8-16,56-75`). Current web imports canonical tokens (`apps/web/src/app/globals.css:21-30`) and has root error/not-found plus app loading boundaries (`apps/web/src/app/error.tsx:21-35`; `apps/web/src/app/not-found.tsx:16-39`; `apps/web/src/app/[locale]/(app)/loading.tsx:1-10`).
- `/me` and notification settings were once missing (`docs/design/PRODUCT-HEALTH-2026-05-16.md:63-69`) but now exist (`apps/web/src/app/[locale]/(app)/me/page.tsx:10-32`; `apps/web/src/app/[locale]/(app)/settings/notifications/page.tsx:54-66`).
- The May handoff also records open human tasks and launch-blocking observations against its own branch/commit (`design-handoff-2026-05/STATUS.md:1-3,28-48`). Those are not current reproductions.

**Minimal action:** add a short historical-status banner/index entry to dated health/handoff records with closure pointers, rather than deleting their evidence or carrying their old P0/P1 labels into a new backlog.  
**Acceptance:** readers can tell snapshot date, current status, and where current requirements live. Any still-open item is reverified against the current tree before scheduling.

## 6. Unapproved proposals — do not silently promote to requirements

The following appear in dated design requests/recommendations, not the accepted current feature list:

- `/saved`, `/me/connections`, per-employer billing, 2FA/session lists, session-expiry modal, marketing/social-proof content, and onboarding celebration (`docs/design/HANDOFF-TO-DESIGN-2026-05-16.md:19-28,41-58`).
- New motion/data-visualization palettes and other speculative tokens (`docs/design/PRODUCT-HEALTH-2026-05-16.md:82-95`). Existing token additions are now implemented (`packages/ui-tokens/src/tokens.css:48-105`), but unimplemented chart/motion ideas remain proposals.
- Algorithmic feed ranking, premium subscriptions/billing, ads, recruiter workspace, learning, newsletters, creator analytics, third-party verification, video transcoding, and service/search decomposition remain deferred until explicit approval (`project-spec.md:86-92`).
- Dark mode and prohibited architectural/UI reversals remain excluded (`project-spec.md:33`; `DESIGN.md:78-80`). Existing billing/employer code is evidence requiring reconciliation, not proof that approval occurred.

## 7. Missing owner-approved acceptance criteria

| Scope | What is missing before a retain/build/remove decision is complete |
| --- | --- |
| Billing/premium | Approved plans/entitlements and actor roles; checkout and invoice state acceptance; webhook authenticity/idempotency and failure recovery; bank-transfer review; cancellation/refund expectations; web/mobile and Arabic copy scope; test/provider evidence. Current endpoints alone do not define these (`apps/api/src/modules/billing/billing.controller.ts:28-71`). |
| Employer/companies | Whether recruiter workspace is approved; company lifecycle and OWNER/ADMIN behavior; job management and applicants; company-search decision; web/mobile parity; deletion/data retention behavior. Current role guards and CRUD are implementation details (`apps/api/src/modules/companies/companies.controller.ts:37-78`), not product acceptance. |
| Saved/bookmarks | Whether to hide or build; supported target types; ownership and stable target identity; save/unsave idempotency; deleted-target behavior; ordering/pagination; empty/error/offline behavior; web/mobile parity. The design ask suggests post/job/profile filters and unsave (`docs/design/HANDOFF-TO-DESIGN-2026-05-16.md:25`), while the orphan schema stores denormalized title/url fields (`packages/shared/src/schemas/bookmark.ts:10-37`); neither is baseline approval. |
| Karama/ratings | Approved feature status, balance/redeem rules, decay/scheduling, abuse/failure cases, and client parity. Only balance/redeem routes are cited here (`apps/api/src/modules/karama/karama.controller.ts:18-29`). |
| Handoff/archive | Owner-approved canonical location and whether snapshot capture should keep writing to a historical directory (`scripts/capture-snapshots.mjs:15`). A move is incomplete until every live reference and deployment exclusion is updated (`AGENTS.md:24-27`; `.vercelignore:16`). |

## 8. Cleanup and deletion audit

### 8.1 Safe local deletion candidates: ignored, regenerable output only

These directories existed during the audit and were ignored by the cited repository rules. **Nothing was deleted.** Stop dependent dev/test processes before local cleanup and expect the next build/type-check/test to regenerate required output (`turbo.json:5-7,17-23`).

| Candidate | Measured content | Ignore evidence | Regeneration/reference-search evidence |
| --- | ---: | --- | --- |
| `apps/web/.next/` | 109 files; 87,483,371 bytes | `.gitignore:12` | Turborepo declares `.next/**` as build output (`turbo.json:5-7`); web type references are generated under `.next` (`apps/web/tsconfig.json:9-12`). References are build/type/runtime infrastructure, not hand-authored source. |
| `apps/mobile/.expo/` | 22 files; 120,875 bytes | `.gitignore:15` | Router types are generated there (`scripts/generate-mobile-router-types.mjs:13`) by mobile `type-check` (`apps/mobile/package.json:12-14`); the TypeScript include is generated type input (`apps/mobile/tsconfig.json:9`). |
| `apps/mobile/coverage/` | 1 file; 11,468 bytes | `.gitignore:45-49` | Mobile tests run Jest with coverage (`apps/mobile/package.json:12-14`) and Turborepo declares coverage as test output (`turbo.json:21-23`). |
| `apps/api/dist/` | 486 files; 1,669,959 bytes | `.gitignore:9-12` | API build/start use `nest build` and `dist/main.js` (`apps/api/package.json:7-19`). Runtime references expect regeneration, not source preservation. |
| `packages/shared/dist/` | 100 files; 302,528 bytes | `.gitignore:9-12` | Node export points to generated output and `build`/`clean` regenerate/remove it (`packages/shared/package.json:7-24`). |
| `packages/db/dist/` | 4 files; 2,271 bytes | `.gitignore:9-12` | Node export and TypeScript build/clean tasks define it as generated (`packages/db/package.json:7-25`). |
| `packages/ui-web/dist/` | 152 files; 307,067 bytes | `.gitignore:9-12` | Build/clean tasks and package files identify generated output (`packages/ui-web/package.json:5-16`); tests compile first (`packages/ui-web/package.json:16`). |
| `packages/ui-tokens/dist/` | 8 files; 32,690 bytes | `.gitignore:9-12` | Build/clean tasks define generated output (`packages/ui-tokens/package.json:12-21`); canonical CSS consumed by web remains source under `src` (`packages/ui-tokens/package.json:7-15`; `apps/web/src/app/globals.css:25-26`). |

**Total measured candidate output:** 89,930,229 bytes across 882 files. Repository-wide tracked/untracked reference searches found operational build, clean, test, TypeScript, Docker, lint, and deployment references—not evidence that these ignored directories contain unique source. This conclusion does not extend to unexamined, non-ignored `artifacts/` or other untracked content.

### 8.2 Conditional source candidate — requires the Saved scope decision

| Candidate | Repository-wide reference evidence | Recommendation |
| --- | --- | --- |
| `packages/shared/src/schemas/bookmark.ts` | The schema defines its own types (`packages/shared/src/schemas/bookmark.ts:1-38`) but is absent from the shared barrel (`packages/shared/src/index.ts:1-22`). Searches found no import, API controller/service, Prisma bookmark model, or saved route. Other bookmark hits are the visible icon/navigation (`packages/ui-web/src/AppShell.tsx:114-126`; `packages/ui-native/src/Icon.tsx:19,220`), localization, dated design requests, and prototype assets—not consumers of this schema. | **Conditional only.** If Saved is rejected, hide/remove its navigation and remove this unreferenced schema in the same scoped change. If Saved is approved, retain or redesign it against approved acceptance criteria. Do not delete the schema alone while presenting Saved as shipped. |

### 8.3 Explicit non-deletions

| Item | Why it must not be deleted now | Reference-search evidence |
| --- | --- | --- |
| `design-handoff-2026-05/` | Historical design source and implementation record; code mirror is mostly different and has active references. Archive/index rather than treating it as generated output. | `design-handoff-2026-05/00-README.md:1-18,33-41`; `design-handoff-2026-05/IMPLEMENTATION_COMPLETE.md:8-30`; `AGENTS.md:24-27`; `scripts/capture-snapshots.mjs:15`; `.vercelignore:16`. |
| `docs/_archive/prototype-2025/` | Although all 12 handoff prototype files hash identically to it, this archive is explicitly named a design authority. | `project-spec.md:11`; `design-handoff-2026-05/00-README.md:12-15`. |
| Dated health, design-request, handoff, and cleanup documents | They preserve decision/evidence history. Correct current-state labeling and close stale items instead of erasing the record. | `docs/design/PRODUCT-HEALTH-2026-05-16.md:1-16`; `docs/HANDOFF.md:69-95`; `docs/repo-cleanup-2026-04-28.md:1-22,50-68`. |
| Billing, employer/company, Karama, or saved implementation | Live billing/company/Karama paths require owner scope and data decisions; Saved has visible navigation and an orphan schema requiring one coherent decision. | `apps/api/src/app.module.ts:12-19,27,70-73`; `packages/ui-web/src/AppShell.tsx:114-126`; `project-spec.md:86-92`. |
| `yup` dependency/lockfile entries | Five live mobile source imports were found; removal now would break validation. | `apps/mobile/package.json:66`; `apps/mobile/app/(auth)/login.tsx:8`; `apps/mobile/app/(auth)/register.tsx:8`; `apps/mobile/app/(auth)/forgot-password.tsx:6`; `apps/mobile/app/(auth)/reset-password/[token].tsx:6`; `apps/mobile/src/components/onboarding/schema.ts:1`. |
| Old branches/worktrees listed in the April cleanup record | That list is historical, not a current inventory or fresh deletion authorization. No git mutation was performed. | `docs/repo-cleanup-2026-04-28.md:24-48`; `docs/HANDOFF.md:85-87`. |

## 9. Verification gaps

### VG-01 — Current gate results are unknown

The baseline requires token lint, format check, lint, type-check, and tests (`project-spec.md:66-76`), with the fuller command sequence recorded in `docs/HANDOFF.md:69-83`. None was run in this notes-only audit. Therefore this report makes no claim that the dirty tree builds, passes tests, has no type errors, or is releasable.

**Required closure:** after source decisions/changes, run the actual root scripts—especially `pnpm type-check`, not the stale `pnpm typecheck` (`package.json:11-18`; `AGENTS.md:19-20`)—and record current results separately.

### VG-02 — Static traces are not runtime acceptance

No API calls, browser flows, Expo sessions, payment webhooks, email delivery, scheduler execution, R2 operations, or database migrations were exercised. Existing controller/service code proves presence, not deployed configuration or correct behavior. The production mail module itself distinguishes configured Resend from missing production configuration (`apps/api/src/modules/mail/mail.module.ts:21-32`).

### VG-03 — Manual release evidence remains open

The handoff still calls for real-device refresh/deep-link/push/haptics/offline/SSE/message evidence, native Arabic review, universal-link production identifiers, release environment values, and counsel review (`docs/HANDOFF.md:54-65`). These were not closed by this audit. The dated handoff's browser QA was local Playwright with mocked API responses, not production validation (`design-handoff-2026-05/IMPLEMENTATION_COMPLETE.md:48-69`).

### VG-04 — Corpus is current only for this dirty-tree snapshot

Uncommitted and untracked files were included deliberately. Later edits can invalidate line counts, references, and conclusions. Generated artifact coverage was metadata-based, and historical test totals such as `docs/HANDOFF.md:46-52` were not recomputed.

## 10. Minimal ordered action plan

1. **Resolve scope first:** owner decides billing/premium, employer/recruiter, Karama/ratings, companies search, and Saved. Use §7 to write acceptance criteria. Do not delete live scope during document cleanup.
2. **Repair user-facing navigation and contracts:** after those decisions, hide or wire Saved/Employer and add route tests; update the API contract for every retained surface. Acceptance is CM-02/CM-03, not merely adding links.
3. **Correct current guidance:** fix Expo/command/profile/font references (CM-04/CM-05), close Resend/retention implementation items without falsely claiming operational verification (CM-06), and add historical closure context (MR-04).
4. **Reduce maintenance drift:** split only the cited oversized pages/components with regression tests (MR-01). Treat Yup consolidation as a separate optional migration, never as blind dependency cleanup (MR-02).
5. **Preserve but contextualize the handoff:** mark it historical/read-only and repair live comment paths. Relocate only with all active references updated (MR-03).
6. **Optionally reclaim local space:** delete only the ignored outputs in §8.1 while builds/tests are stopped, then run and record the real gates. Generated output deletion is not a substitute for source cleanup or verification.
