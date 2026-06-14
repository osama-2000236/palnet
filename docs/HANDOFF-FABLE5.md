# HANDOFF — Fable 5 Onboarding & Continuation Brief

> **Audience:** Claude Fable 5, taking over active development of Baydar.
> **Date:** 2026-06-12 · **Branch of record:** `main` · **Repo root:** `C:\LinkedIn`
> **Read this AFTER** `CLAUDE.md`, `project-spec.md`, `DESIGN.md`, `BRAND.md`, then this file. This file supersedes the stale status in `docs/HANDOFF.md` (see §2).

---

## 0. What Baydar is, in one paragraph

Baydar (بيدر) is a **LinkedIn-class professional network for the Palestinian / Arab market** — Arabic-first, RTL by default. It ships as a **Next.js 15 web app** and an **Expo SDK 54 (React Native 0.81) mobile app** from one Turborepo monorepo, backed by a **NestJS REST API** on **Prisma/Postgres**, with **SSE** live updates, **self-managed JWT refresh** auth, **Cloudflare R2** media, and **Expo push**. The category model is LinkedIn (feed, profiles, connections, messaging, jobs, employers, premium/monetization), but the product is **not a LinkedIn clone** — warm olive/terracotta brand, local payment rails, Karama trust-score economy. See §6 for your mission against this goal.

---

## 1. Who built what so far (provenance)

All commits are authored by the repo owner (`Osama Abujarad`) but the actual code was produced by **two AI agents driven by the owner**:

| Agent                      | Role in history                                                                                                                                                                                                                                                             | Evidence                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Claude (Opus 4.7)**      | Primary co-author across nearly the entire history — 60 of the last ~60 substantive commits carry `Co-Authored-By: Claude Opus 4.7`. Built monetization backend, design passes, resilience surfaces, repo optimization.                                                     | `git log --grep "Co-Authored-By: Claude"`                          |
| **Codex**                  | Stabilization / cleanup waves. Owned the `codex/repo-stabilization-cleanup` branch: repaired compile blockers from a dirty Claude tree, removed fake placeholder routes, locked viewer-scoped cache headers, unified web auth refresh, pruned dead worktrees/branches.      | `docs/audit/REPO-STABILIZATION-2026-06-02.md`, commits `#31`/`#32` |
| **Claude Design platform** | Visual/UX design passes were handed off to a dedicated Claude Design workflow (see `design-handoff-2026-05/`, `docs/design/handoff-plan.md`, `docs/design/HANDOFF-TO-DESIGN-*.md`). This is the established channel for UI/UX work — **you will keep using it (see §6.3).** | `docs/design/`, `design-handoff-2026-05/`                          |

### 1.1 Worktree & branch state (verified 2026-06-12)

**There is nothing in-flight to recover. Start from a clean `main`.**

- **Registered git worktrees:** only two —
  - `C:\LinkedIn` → `main` @ `56e7afd`
  - `C:\LinkedIn\.claude\worktrees\naughty-bhaskara-5727e9` → `claude/naughty-bhaskara-5727e9` @ `56e7afd` (this brief was written here; working tree clean)
- **Branches:** `main`, `codex/repo-stabilization-cleanup`. The Codex branch is **fully merged into `main` — zero commits ahead.** It can be deleted; no work is stranded on it.
- **Open PRs:** none.
- **Detached / stale Codex worktrees** under `C:\Users\osama\.codex\` (e.g. `teamflow/runs/*`) are **run logs from past sessions, not source worktrees** — ignore them. The repo-stabilization audit already removed the real stale worktrees.

> Action for you: when you begin, create your own worktree/branch off `main`. Do not resume any existing branch.

---

## 2. ⚠️ Stale docs — read this before trusting the repo's own status files

`docs/HANDOFF.md` and the `docs/audit/SPRINT-12..21` files describe the repo **as of Sprint 21, before PR #25**. They are **out of date** on two material points. Treat them as history, not current truth:

1. **F-04 (company admin/management) is NO LONGER an open gap.** `docs/HANDOFF.md` used to list "Company admin/management remains open from Sprint 12 audit F-04." **It shipped.** [PR #25](#) (`0bebf5a`, "Beta monetization launch surfaces — Sprints 22+23+24 partial", merged 2026-05-15, ~8000 LOC / 100 files) added a full `apps/api/src/modules/companies/` module (controller, service, company-jobs, company-members, role guard), registered in `app.module.ts`. → **2026-06-13:** companies search is now shipped across API/shared/web/mobile.

2. **A large monetization BACKEND shipped with NO frontend.** PR #25's own commit message states: _"UI surfaces (C1–C7) are tracked as the next iteration; this commit keeps the backend complete and consistent across web and mobile."_ That UI **was never built** and is **not listed anywhere in `docs/HANDOFF.md`'s follow-ups** — it is a silent gap. This is your single biggest, best-bounded opportunity (see §5).

**Housekeeping status:** `docs/HANDOFF.md` was reconciled again on 2026-06-13. It now records F-04 closed, companies search shipped, C5/C6 done, and the remaining C1-C4/C7 monetization work.

---

## 3. Repo map (so you can navigate cold)

```
apps/
  web/      Next.js 15 App Router, routes under src/app/[locale]/
  mobile/   Expo SDK 54 / RN 0.81, routes under app/(app)/  (file-based)
  api/      NestJS 10, modules under src/modules/
packages/
  ui-tokens/  THE source of truth for every color/space/radius/shadow/font.
              tokens.css (web), tokens.native.ts (RN), tailwind-preset.ts.
  ui-web/     Shared web primitives (framework-neutral — NO next/* imports).
  ui-native/  Shared RN primitives. Must stay in lockstep with ui-web.
  shared/     Zod contracts shared by api + web + mobile (schemas/*.ts).
  db/         Prisma schema + migrations + seed.
  config/     Shared tsconfig/eslint/etc.
docs/         Design system, RTL/mobile/parity contracts, audits, this file.
design-handoff-2026-05/   Bundle handed to Claude Design platform.
```

### API modules present (NestJS)

`auth`, `profiles`, `feed`/`posts`/`comments`/`reactions`/`reposts`, `connections`, `messaging`, `notifications`/`devices`, `jobs`/`applications`, **`companies`** (controller + company-jobs + company-members + role guard), **`billing`** (checkout, invoices, HyperPay webhook, employer-entitlements, wallets, currency), `ratings` (Karama), `account` (delete/export), `media` (presign + confirm/scan), `search` (people/posts/jobs), `admin` moderation/billing review, `safety` (report/block).

### Shared contracts of note

`packages/shared/src/schemas/billing.ts` — `Plan`, `Subscription`, `Invoice`, `CheckoutSession` (card / bank-transfer / **POINTS** / **wallet**), `CheckoutSessionBody`, `BankTransferReceiptBody`, `AdminInvoiceActionBody`. `PlanCode` = `EMPLOYER_FREE | EMPLOYER_BASIC | EMPLOYER_PRO | FEATURED_SLOT | USER_PREMIUM`. `PaymentMethod` = `CARD | BANK_TRANSFER | POINTS | JAWWALPAY | PALPAY | REFLECT`. `packages/shared/src/schemas/karama.ts` — trust-score economy.

---

## 4. Repo health (verified facts, not vibes)

| Dimension                                   | State                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Validation gate**                         | `pnpm lint:tokens`, `format:check`, `lint`, `type-check`, `test` were green at last stabilization (audit `2026-06-02`). 158/158 API tests passed at PR #25. Re-run before trusting.                                                                                                                                                                                                                   |
| **Versions**                                | web `next@15.0.2`, mobile `expo@~54.0.35` (RN 0.81), api `@nestjs/core@^10.4.6`. TypeScript pinned `~5.9.2` repo-wide.                                                                                                                                                                                                                                                                                |
| **Real app-source TODO/FIXME**              | Only **12** (excluding `node_modules`/`.native-modules`). Almost all are _intentional_ monetization stubs: `billing/wallets/{jawwalpay,palpay,reflect}.client.ts` throw `NOT_IMPLEMENTED` until merchant onboarding; `billing/currency.ts` uses a hardcoded FX snapshot. **2 are real UI gaps:** `packages/ui-native/src/AppShell.tsx` — search `TextInput` and profile menu are placeholder `TODO`s. |
| **Largest source files** (split candidates) | `api/.../companies.service.ts` 628 · `api/.../messaging.service.ts` 595 · `api/.../billing.service.ts` 502. Web/mobile monoliths flagged in old docs (`messages`, `me/edit`, mobile `onboarding`/`[roomId]`) have **already been split** into `_components/` — verify, don't re-split blindly.                                                                                                        |
| **Caching discipline**                      | Viewer-scoped DTOs use `Cache-Control: private, no-store` (enforced by `viewer-cache-control.spec.ts`). Keep this — it's a hard rule in `CLAUDE.md`.                                                                                                                                                                                                                                                  |
| **Realtime**                                | SSE is the active transport. Do **not** reintroduce a socket layer without explicit approval.                                                                                                                                                                                                                                                                                                         |

### Known follow-ups still genuinely open (post-PR #25)

- **Monetization UI (C1–C7)** — C5 Karama-as-payment and C6 skill endorsement are now implemented; C1–C4 and broader C7 parity/review remain. _(See §5.)_
- **`/employer/[slug]/billing`** (per-org billing surface). `/saved` and `/me/connections` now route to real shipped flows on web and mobile.
- **Companies search** — shipped 2026-06-13 across API/shared/web/mobile.
- **Admin moderation + billing-review queues** — localized web operator UIs exist at `/moderation` and `/billing`; still need operator QA/design review.
- **Account hard-delete after 30-day grace** — service and internal endpoint exist (`POST /admin/internal/account-retention/run`); production scheduler config still needed.
- **Real email provider** (console transport today), **Redis-backed SSE fanout + rate-limit** (in-memory now; `RateLimitBackend` interface ready), **virus/NSFW media scan** (`media/confirm` endpoint exists; real scanner deferred).
- **Pre-launch env tasks:** universal-link files are drafts (need Apple Team ID + Android SHA256), EAS project id, prod Sentry/PostHog, **native Arabic copy review**, **legal/privacy counsel review**.
- **Flaky test:** `apps/mobile/src/__tests__/onboarding-flow.test.tsx` (around `onboarding-identity-confirm`) fails intermittently then passes on re-run — async/timing flake, not a real regression. Verified 2026-06-12: full suite is **31 suites / 83 tests / 5 snapshots green** on a clean re-run. Stabilize the test rather than chasing a phantom bug.

### Gate state at handoff (verified 2026-06-12, clean `main`)

`pnpm lint:tokens` clean · `pnpm format:check` green · `pnpm type-check` 13/13 · `pnpm test` green (one flaky mobile test, see above). `main` working tree is clean (only untracked local `.claude/settings.json`).

---

## 5. Your headline deliverable: Monetization UI (C1–C7)

This is the cleanest large, well-bounded piece of work in the repo and the best fit for your strengths (huge simultaneous context, long-horizon multi-file SWE). The backend and Zod contracts already exist; you are wiring usable surfaces on web **and** mobile.

| ID  | Surface                                            | Backs onto                                                             | Notes                                                                                                                            |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `/me/premium` — plan comparison + upgrade          | `USER_PREMIUM` plan, `POST /billing/checkout-session`                  | Honest pricing; show local currency + USD original.                                                                              |
| C2  | Checkout flow — method picker                      | `CheckoutSession` (card / bank-transfer / POINTS / wallet)             | Render IBAN instructions for bank-transfer; wallet tiles show **"coming soon"** until provider configured (do NOT fake success). |
| C3  | `/employer/[slug]/billing` (**new route**)         | `EMPLOYER_BASIC/PRO/FEATURED_SLOT`, employer-entitlements, job credits | Plan status + upgrade + remaining job-credit display.                                                                            |
| C4  | Invoices / billing history + receipt upload        | `GET /billing/invoices`, `BankTransferReceiptBody`                     | User + company scopes.                                                                                                           |
| C5  | Karama-as-payment wired into existing `/me/karama` | `POINTS` method, `karama.ts`                                           | **Done 2026-06-13:** web/mobile localized; premium redemption uses points checkout.                                              |
| C6  | Skill-endorsement UI on profile                    | `POST /profiles/:handle/skills/:skillId/endorse`                       | **Done 2026-06-13:** web/mobile profile skill panels endorse and update counts; API route/schema/tests added.                    |
| C7  | Mobile parity for C1–C6                            | same contracts                                                         | Partially done for C5/C6; C1–C4 still need web + native lockstep.                                                                |

Context to load for this: `packages/shared/src/schemas/billing.ts` + `karama.ts`, `apps/api/src/modules/billing/*` + `companies/*`, existing `me/karama` pages, `apps/web/src/app/[locale]/(app)/employer/[slug]/page.tsx`, plus `DESIGN.md` and the `ui-web`/`ui-native` primitive set.

**Cheaper leftover tasks:** `/me/connections`, `/saved`, the docs reconciliation, and the companies-search decision are closed in the 2026-06-13/14 Codex pass.

---

## 6. Your mission, scope, and borders

### 6.1 Goal

Baydar must become a **usable, shippable LinkedIn-class product on both web and mobile.** "Usable" is the bar: every primary professional action (sign up → complete profile → connect → post → message → find a job → apply → upgrade) works end-to-end, with real loading / empty / error / offline / disabled / success states — not console-only failures, not fake successes. Upgrade and enhance toward that goal; don't gold-plate beyond it.

### 6.2 Hard borders (do NOT cross — these are `CLAUDE.md` law)

- **Tokens only.** Never hardcode a hex/rem/px/shadow. Need a value? Add a token in `packages/ui-tokens` first, then consume it.
- **No Tailwind blue / no generic SaaS blue / no dark mode / no decorative gradients or orbs / no nested cards.** Brand is olive (`--brand-*`) + terracotta (`--accent-*`).
- **RTL-safe CSS only.** Logical properties (`start`/`end`), never `left`/`right`/`margin-left`. See `docs/design/RTL.md`.
- **Arabic-first.** Every string exists in `ar` first; never ship a hardcoded English string in a component.
- **Web ↔ mobile lockstep.** Build a web component → stub/ship its native twin in the same change, same prop names (`docs/design/PARITY.md`).
- **Shared UI is framework-neutral.** No `next/*` or Expo Router imports inside `packages/ui-*`.
- **No placeholder production routes. No public cache for viewer-scoped data.**
- **Don't redesign Baydar** without updating `DESIGN.md` + the prototype decision record. Don't add deps without checking the monorepo already solves it.

### 6.3 ⭐ Routing rule: design/UX work goes to Claude Design platform

You are a **builder/engineer** in this project. **If a surface has a visual-design or UX problem** — unclear hierarchy, weak empty/error states, layout that fails the 5-dimension critique at 360/390/430/600/820/1024/1366/1440/1920 px in RTL **and** LTR, mobile that's just "squeezed desktop," anything failing the gate in `docs/design/open-design-audit.md` — **do not freestyle the visual design yourself. Hand it off to the Claude Design platform** through the established channel (`docs/design/handoff-plan.md`, the `design-handoff-2026-05/` bundle pattern). Implement against the design that comes back. Your job is correct, tokenized, accessible, in-lockstep _implementation_; novel visual design is the design platform's job. When in doubt about whether something is "engineering" or "design," it's design → hand it off.

### 6.4 Organize, compact, define borders (explicit ask from the owner)

Alongside feature work, leave the repo **more organized and compact** than you found it:

- **Reconcile the docs.** `docs/HANDOFF.md` is stale (§2); several audit docs describe pre-PR-#25 reality. Make the live status truthful and singular so there's one source of truth.
- **Delete the merged `codex/repo-stabilization-cleanup` branch** (0 commits ahead of `main`) once confirmed.
- **Draw module borders.** Keep API service files under control (the 3 largest — companies/messaging/billing services — are split candidates _only if it reduces real state/complexity_, not for line-count vanity). Keep `packages/ui-*` strictly framework-neutral.
- **One component = one PR / one commit.** Never bundle unrelated changes (`CLAUDE.md` commit discipline).

---

## 7. Validation gate (run before declaring anything done)

```powershell
pnpm install --frozen-lockfile
pnpm lint:tokens
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm check:release-placeholders
pnpm --filter @baydar/db generate
```

Web visual/a11y when UI changed: `pnpm --filter @baydar/web test:a11y`, Playwright responsive shots across the width matrix in RTL + LTR. Mobile when touched: `pnpm mobile:recovery-check`. Expected state on clean `main`: all green (lint may print non-fatal import-order warnings).

---

## 8. When in doubt (decision order)

1. `DESIGN.md` for the visual/component decision.
2. The prototype: `docs/_archive/prototype-2025/Baydar Prototype.html` (open in a browser — it's the visual ground truth).
3. Still ambiguous → **ask the owner.** One question saves a day of rework. Don't guess on product direction.

> Closing reminder: Baydar is inspired by the _category_ (LinkedIn), not the product. If a decision would make Baydar look like LinkedIn, pick the other one.
