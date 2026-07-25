# Baydar — Missing Flows → Fable 5 build handoff

> **What this is.** A design pass covering the flows that were shipped as backend/routes but never given real, usable, in-lockstep UI. The visual ground truth is the attached `Baydar Missing Flows (standalone).html` (open it in a browser — nav jumps to each flow, top-right toggles Arabic ⇄ English). This document is the paste-in brief for **Claude Code (Fable 5)** to implement against that design.
>
> Every flow below is drawn with **both a web and a mobile treatment** (except the payment-rails reference, which is platform-neutral). Fable 5's job is correct, tokenized, accessible, RTL-safe, web↔mobile-lockstep _implementation_ of these — not a redesign.

---

## How to hand this to Fable 5

1. Drop this file and the standalone HTML into the repo, e.g. `design-handoff-2026-06/missing-flows/`.
2. Open a Claude Code session at the repo root (`C:\LinkedIn`).
3. Attach `Baydar Missing Flows (standalone).html` and paste the prompt in **§ Prompt** below.
4. Fable 5 works one flow = one PR/commit, runs the validation gate (§ Gate) after each slice, and returns the parity matrix + QA evidence.

Read order for Fable 5 before touching code: `CLAUDE.md` → `project-spec.md` → `DESIGN.md` → `BRAND.md` → `docs/HANDOFF.md` → this file.

---

## Flow → repository map

Each mocked flow, the routes/files it lands on, and the contracts it backs onto. Most routes **already exist** (shipped backend-first) — the work is bringing their UI up to the mock and to full state coverage on both platforms.

| #   | Flow (in the mock)                                                                                                       | Web                                                              | Mobile                                             | Contracts / API                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | **Onboarding** — signup → verify → profile → connect → done                                                              | `app/[locale]/(app)/onboarding/page.tsx`, `(auth)/register`      | `app/(app)/onboarding.tsx` + `(app)/_onboarding/`  | `auth`, `profiles`, `connections`                                                                         |
| 2   | **Home (new user)** — completeness card, starter-people, first post                                                      | `(app)/feed/page.tsx`                                            | `(app)/feed.tsx` + `(app)/_feed/`                  | `feed`/`posts`, `connections`, profile completeness                                                       |
| 3   | **Empty / loading / error / offline / no-results system**                                                                | `packages/ui-web` (EmptyState, Illustration, Skeleton)           | `packages/ui-native` (twins)                       | consumed by feed, network, messages, notifications, search                                                |
| 4   | **Messaging** — Focused/Requests tabs, thread, attachment, read receipts                                                 | `(app)/messages/page.tsx`                                        | `(app)/messages/` + `(app)/_message-thread/`       | `messaging` (SSE live), `safety` (request gating)                                                         |
| 5   | **Jobs & Employers** — post a job, applicant tracking, company page                                                      | `(app)/employer/[slug]/jobs/new`, `…/jobs/[jobId]`, `…/page.tsx` | `(app)/employer/`, `(app)/company/`, `(app)/jobs/` | `jobs`/`applications`, `companies` (+ company-members, role guard)                                        |
| 6   | **Premium & monetization** — plans, checkout method picker, bank-transfer + receipt, invoices, employer billing, success | `(app)/me/premium/`, `(app)/employer/[slug]/billing/`            | `(app)/me/premium/`, `(app)/employer/`             | `billing` (checkout, invoices, entitlements, wallets), `shared/schemas/billing.ts` + `karama.ts`          |
| —   | **Payment-rails reference** (JawwalPay, PalPay, reflect, bank, card, points)                                             | platform-neutral spec                                            | —                                                  | `billing/wallets/{jawwalpay,palpay,reflect}.client.ts` (stubbed `NOT_IMPLEMENTED`), `billing/currency.ts` |

**Parity note:** every card in the mock is labelled `WEB` or `MOBILE`. Where a flow shows only one platform in the repo today, ship its twin in the same change (same prop/variant names — `docs/design/PARITY.md`). Wallet tiles (JawwalPay/PalPay/reflect) render **"coming soon"** — never fake a success until merchant onboarding lands.

---

## Prompt (paste into Claude Code)

```xml
<role>
You are Fable 5, the build engineer for Baydar (بيدر), an Arabic-first, RTL-by-default
professional network (Next.js 15 web + Expo SDK 54 mobile + NestJS API, Turborepo).
You implement an approved design pass; you do not redesign the product or copy LinkedIn.
</role>

<objective>
Bring the "Missing Flows" design (attached: Baydar Missing Flows (standalone).html) to
real, usable, in-lockstep UI on web AND mobile. The flows: onboarding, new-user home,
the empty/loading/error/offline/no-results state system, messaging (Focused/Requests +
thread), jobs & employers (post a job, applicant tracking, company page), and premium/
monetization (plans, checkout method picker, bank-transfer + receipt, invoices, employer
billing, success). Most routes already exist backend-first — verify each against the mock,
close its state gaps, and prove web↔mobile parity.
</objective>

<source_order>
1. Current implementation + tests in apps/web, apps/mobile, packages/ui-web,
   packages/ui-native, packages/ui-tokens, packages/shared.
2. CLAUDE.md, AGENTS.md, DESIGN.md, BRAND.md, docs/HANDOFF.md, docs/design/*.
3. The attached Baydar Missing Flows design (visual ground truth for these flows).
When the design and a current source-of-truth doc conflict, report it and follow the
repo doc; never silently assume the mock overrides a shipped product decision.
</source_order>

<product_contract>
- Arabic RTL is primary; English LTR is equally complete. Arabic string exists first.
- Olive (--brand-*) + terracotta (--accent-*) on warm parchment. No blue, no dark mode,
  no decorative gradients/orbs, no nested cards.
- Tokens only — never hardcode a hex/px/rem/shadow. Need a value? Add it to
  packages/ui-tokens first, then consume it.
- Logical CSS only (start/end); numbers, prices, dates, handles stay LTR in Arabic text.
- Shared UI (packages/ui-*) is framework-neutral: no next/* or expo-router imports.
- Every mutation shows disabled/loading/error/success; every fetch shows
  loading/empty/offline/error/retry. No console-only failures, no fake successes.
- Web↔mobile lockstep: build a web component → ship/stub its native twin in the same
  change with matching prop and variant names.
- Pages/components under ~300 LOC; no `any`; viewer-scoped data stays private/no-store.
</product_contract>

<flow_scope>
Implement in this order, one flow = one PR/commit:
1. State system (ui-web + ui-native EmptyState / Illustration / Skeleton), because feed,
   network, messages, notifications, and search all consume it. Match the anatomy in the
   mock: illustration + title + description + action; agrarian line-art olive illustrations.
2. Onboarding — 5 steps (signup → email verify → profile complete → first connect → feed),
   focused single-purpose shell, per-step empty + completion states, web + native.
3. New-user home — completeness card, starter-people rail, first-post composer, web + native.
4. Messaging — Focused/Requests tabs with request gating, thread with attachment + read
   receipts, typing indicator; keep SSE as the transport (do not add a socket layer).
5. Jobs & employers — post-a-job form, applicant tracking board, company page; verify
   employer create + job-publish exist and work in native runtime.
6. Premium & monetization — plans (local currency + USD original), checkout method picker
   (card / bank-transfer / POINTS / wallet), bank-transfer IBAN + receipt upload, invoices/
   billing history (user + company scopes), employer billing, success. Wallet tiles show
   "coming soon"; POINTS uses the karama checkout path. Honest pricing only.
For each flow: use realistic fixtures; cover loading, empty, offline, API error, retry,
disabled, success, and long-content cases the flow supports.
</flow_scope>

<required_process>
1. Cite the exact existing tokens, components, routes, tests you will reuse before editing.
2. Produce a route-and-state parity map per flow before changing UI.
3. Show Arabic web desktop, Arabic web narrow (390px), and Arabic native mobile for each
   flow; add an English pass for mixed-direction and overflow risk.
4. Implement in small vertical slices; reuse shared atoms; do not fork a parallel component
   system. Re-run the relevant automated + visual checks after each slice.
</required_process>

<deliverables>
- Updated web + mobile UI for each flow, tokenized and RTL-safe.
- Token/component diffs only where existing primitives can't express the design.
- A parity matrix labelling each row Verified / Partial / Intentional exception / Blocked.
- Before/after evidence at matching states and viewports (RTL + LTR).
- A QA report: command, expected, actual, evidence path.
</deliverables>

<acceptance_criteria>
- Every flow reaches the mocked design on web AND mobile, with real loading/empty/offline/
  error/retry/disabled/success states — no fake successes.
- No hardcoded colors/px; all production values token-backed; focus + touch targets pass.
- Arabic RTL and English LTR render with no horizontal overflow or clipping at 390px.
- No visual snapshot depends on live SSE timing.
- Gate green: pnpm lint:tokens, format:check, lint, type-check, test,
  check:release-placeholders, @baydar/db generate; plus web test:a11y + Playwright width
  matrix (RTL+LTR) when web UI changed, and mobile:recovery-check when mobile touched.
</acceptance_criteria>

<review_loop>
Return FINDINGS, DECISIONS, IMPLEMENTATION, QA EVIDENCE, RESIDUAL RISKS. Cite a repo path
for each finding; mark inferences. Stop and ask only when a product decision changes scope.
</review_loop>
```

---

## Gate (run before declaring any flow done)

```powershell
pnpm install --frozen-lockfile
pnpm lint:tokens
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm check:release-placeholders
pnpm --filter @baydar/db generate
# web UI changed:
pnpm --filter @baydar/web test:a11y
# mobile touched:
pnpm mobile:recovery-check
```

## Hard borders (CLAUDE.md law — do not cross)

Tokens only · no blue / no dark mode / no decorative gradients / no nested cards ·
RTL-safe logical CSS only · Arabic-first strings · web↔mobile lockstep · shared UI stays
framework-neutral · no placeholder production routes · no public cache for viewer-scoped
data · don't redesign Baydar without updating `DESIGN.md`. If a decision would make Baydar
look like LinkedIn, pick the other one.
