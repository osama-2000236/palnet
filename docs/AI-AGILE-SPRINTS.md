# AI Agile Sprint Roadmap

Date: 2026-06-14
Audience: Codex, Claude, Claude Design, QA agents, and the project lead
Status: forward plan after the company-profile work

This document is the shared execution plan for finishing Baydar as a deployable product before implementing the Claude Design handoff. It does not replace `DESIGN.md`, `BRAND.md`, `docs/HANDOFF.md`, or the design bundle. It tells every AI model what order to work in, where the handoffs are, and what "done" means.

## Current Baseline

Accepted into the working baseline:

- `829a073 feat(web): public company page /company/[slug]`
  - Web company profiles now show logo, name, verified state, tagline, industry, location, website, about, and up to 10 open jobs.
  - Company search results now route to the company profile.
- `8c13fc4 feat(mobile): public company screen parity`
  - Mobile has the matching company profile route, `JobRow` reuse, view-all job navigation, and a hidden route entry.
- No API change was needed for this slice because `GET /companies/:idOrSlug` and the `companyId` jobs filter already existed.
- `/me/connections` is not a real open gap anymore. The shipped `/network` manager covers accepted, incoming, and sent connections on web and mobile.

Remaining product and launch gaps that matter before a public deploy:

- `/saved` now has a real bookmark model, API, web route, mobile route, and save/remove affordances. Treat it as regression scope, not a placeholder gap.
- Monetization C1-C4 and C7 remain incomplete: premium page, checkout method picker, employer billing, invoices/receipt upload, and final web/mobile parity.
- Admin moderation and billing review surfaces exist, but still need operator QA, role-gating review, and design-platform review.
- Account hard-delete has a service/internal endpoint, but production scheduler wiring still needs to be made real.
- Release environment tasks remain: EAS project id, Sentry/PostHog production values, Apple Team ID, Android SHA256 association files, and production association-file verification.
- Pre-design engineering blockers from the deployment review must be cleared: security settings API/page mismatch, auth recovery link routes, Karama idempotency/data integrity, deleted-author search filtering, and the flaky/full Playwright gate behavior.

## Agent Operating Contract

Every AI model working on Baydar must follow this contract.

- Start each sprint from a fresh branch off the current branch of record unless the lead says otherwise.
- First command before changing code: `git status --short`.
- Read `AGENTS.md`, `docs/HANDOFF.md`, this file, and the sprint-specific files listed below.
- One sprint branch owns one vertical slice. Do not mix unrelated fixes.
- No agent may add a fake route, fake success state, or local-only placeholder for a production feature.
- Visual design decisions go to the Claude Design platform. Engineering agents implement tokenized, accessible, RTL-safe designs.
- Web and mobile parity is required unless the feature is explicitly web-only, such as admin/legal.
- Backend contract changes must land in `packages/shared` first or in the same sprint.
- Prisma migrations must include service tests and a rollback note in the handoff.
- Any touched interactive element must keep a `focus-visible` ring using `box-shadow: var(--focus-ring)`.
- Do not hardcode colors, spacing, shadows, or English copy.

### Required Handoff Note

At the end of every sprint branch, the owning agent leaves this note in the PR body or final handoff message:

```markdown
## Sprint Handoff

- Branch:
- Commit(s):
- Scope shipped:
- Files/routes touched:
- API/shared contract changes:
- DB migrations:
- Env vars added or changed:
- Tests run:
- Screenshots or QA evidence:
- Known risks:
- Next sprint recommendation:
```

## Definition of Done

A sprint is not done until all applicable gates pass.

Root gate:

```powershell
pnpm lint:tokens
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm check:release-placeholders
pnpm --filter @baydar/db generate
```

Additional gates:

- API touched: `pnpm --filter @baydar/api test`
- Web UI touched: targeted Jest/Playwright tests plus responsive RTL and LTR screenshots for affected routes.
- Mobile touched: `pnpm mobile:recovery-check` plus simulator or device smoke evidence when navigation, push, deep links, camera/media, or offline behavior changes.
- Release touched: `pnpm check:release-production` with real production env in the deployment environment, not necessarily on a local workstation.

Note: this repo script is named `type-check`, not `typecheck`.

## Sprint 22 - Deployment Blocker Sweep

Goal: remove correctness issues that would make a team lead block deployment even if the main gate is green.

Primary owners:

- API agent: auth/session endpoints, Karama data integrity, search filters.
- Web agent: settings/security page behavior and auth recovery links.
- QA agent: regression tests and targeted end-to-end checks.
- Lead agent: final gate and scope control.

Scope:

- Reconcile `apps/web/src/app/[locale]/(app)/settings/security/page.tsx` with real API support. Either implement the missing session/password endpoints properly or adjust the UI to only call supported endpoints.
- Fix auth recovery/delete links that point to `/{locale}/auth/login` if the real route is `/{locale}/login`.
- Enforce Karama award idempotency at the database/service level and test duplicate award races.
- Make post search exclude soft-deleted authors, matching feed behavior.
- Stabilize the full web Playwright gate so visual coverage does not time out on normal runs.

Done:

- API route coverage updated.
- Unit tests cover auth, Karama duplicate prevention, and deleted-author search.
- Web tests cover security settings failure/success states and auth route links.
- Full root gate passes.

## Sprint 23 - Saved Bookmarks

Status: implemented on 2026-06-14. Keep this section as regression scope for QA and future agents.

Goal: ship `/saved` as a real product feature, not a shell.

Primary owners:

- API agent: Prisma model, API module, contract tests.
- Shared agent: bookmark schemas and DTOs.
- Web agent: `/saved` route and save/remove controls.
- Mobile agent: hidden saved route and matching save/remove controls.
- QA agent: end-to-end saved flows.

Scope:

- Add a `Bookmark` persistence model with owner, target type, target id, created timestamp, and a uniqueness constraint.
- Support at minimum posts and jobs. Add company/profile saves only if the product contract is explicit.
- Add create/remove/list APIs with owner-only access and viewer-scoped cache rules.
- Wire feed/job save buttons to the API.
- Build the web `/saved` route and the mobile saved screen using existing atoms and illustrations.
- Include loading, empty, error, offline, remove, and optimistic-update states.

Done:

- Prisma `Bookmark` model and migration exist for POST/JOB targets with owner-target uniqueness.
- `/bookmarks` list/create/delete exists with server-owned display DTOs.
- `Post.viewer.bookmarkId` and `Job.viewer.bookmarkId` drive source-surface save buttons.
- Web `/saved`, feed save, jobs list save, and job detail save are wired.
- Mobile hidden `/saved`, profile shortcut, post save, jobs list save, and job detail save are wired.
- Final gate must still be rerun after any follow-up edits.

## Sprint 24 - Monetization Completion C1-C4/C7

Goal: finish the monetization UI that the backend already supports.

Primary owners:

- Web agent: premium, checkout, employer billing, invoices.
- Mobile agent: parity for user-facing monetization surfaces.
- API agent: patch contract gaps only if discovered.
- QA agent: payment-state matrix.
- Design agent: review UX if hierarchy, payment trust, or empty states are unclear.

Scope:

- C1: `/me/premium` with plan comparison and honest upgrade state.
- C2: checkout method picker for card, bank transfer, points, and wallet methods. Wallets must show configured/coming-soon truthfully; do not fake success.
- C3: `/employer/[slug]/billing` with plan status, upgrade, and remaining job-credit display.
- C4: invoices and bank-transfer receipt upload for user and company scopes.
- C7: mobile parity for C1-C4 plus a final review of C5/C6.

Done:

- All methods map to existing billing contracts.
- Bank transfer has clear pending/reviewed/rejected states.
- Employer-only surfaces enforce membership/role checks.
- User-facing Arabic copy is complete in `ar`, `ar-PS`, and `en`.

## Sprint 25 - Admin Operations Hardening

Goal: make moderation and billing review usable by real operators.

Primary owners:

- Web/admin agent: operator UX and route guards.
- API agent: authorization and audit gaps.
- QA agent: admin role matrix.
- Design agent: dense operator review pass.

Scope:

- Review `/moderation` and `/billing` under the admin route group for loading, empty, error, success, and denied states.
- Confirm route-level and API-level role enforcement.
- Ensure moderation actions create auditable records and refresh queues correctly.
- Ensure billing review actions have receipt evidence, rejection reason handling, and no double-approval path.
- Add operator QA fixtures and Playwright coverage.

Done:

- Non-admin users cannot render or act on admin surfaces.
- Operators can complete the main review flows without dev tools.
- Queue actions are tested for success, failure, and stale item states.

## Sprint 26 - Account Lifecycle and Release Environment

Goal: close launch infrastructure gaps that cannot be solved by UI polish.

Primary owners:

- API/release agent: retention scheduler and production env docs.
- DevOps/deployment agent: host configuration, association files, monitoring.
- QA agent: release smoke.

Scope:

- Wire the production scheduler to `POST /admin/internal/account-retention/run` with `INTERNAL_CRON_TOKEN`.
- Document the scheduler owner, cadence, timeout, retry policy, and alert path.
- Verify AASA and Android assetlinks using real Apple Team ID and Android SHA256 certificate fingerprints.
- Configure production EAS, Sentry, PostHog, and release tags.
- Decide and document the real email provider migration plan.
- Run API readiness and release-placeholder checks in the deployment environment.

Done:

- `pnpm check:release-production` passes in production-like CI or deployment env.
- Account hard-delete has evidence from a dry-run/staging execution.
- Universal links and app links resolve with production values.
- Rollback notes exist.

Status (2026-07-02) — engineering half shipped:

- `POST /admin/internal/account-retention/run` accepts `{"dryRun":true}` (no-write preview report) so the staging evidence step is one curl; service + tests updated.
- `baydar-cron-karama-decay` added to `render.yaml` (monthly, 1st 04:00 UTC); account-retention cron already existed.
- Scheduler contract documented in `docs/deployment.md` (owner, cadence, idempotency, timeout, retry, alert path) plus the hard-delete evidence procedure.
- Email provider decision documented: Resend, already implemented in code; only the API key + domain DNS remain.
- Remaining items are owner-credential ops: Apple Team ID + Android SHA256 for universal links, EAS project id + signing, production Sentry/PostHog values, and running the checks in the deployment environment. See `docs/deployment.md` §Production Pre-Flight.

## Sprint 27 - Claude Design Handoff Refresh

Goal: refresh the design bundle after engineering gaps are closed, then ask Claude Design for focused design output.

Primary owners:

- Lead agent: scope and approval gate.
- Design-prep agent: bundle refresh.
- QA agent: screenshots and pain inventory.
- Claude Design platform: visual/UX deliverables.

Scope:

- Update `docs/_archive/design-handoff-2026-05/` so it reflects the current code after Sprints 22-26.
- Include new company profile, saved, monetization, and admin surfaces in the bundle if they shipped.
- Complete mobile screenshots that were previously marked as human gaps.
- Refresh `08-pain.md`, `08-problems.md`, and `10-ask.md`.
- Limit the first Claude Design pass to 2-3 high-leverage asks.

Done:

- Bundle status is truthful.
- Product lead confirms the design ask.
- Claude Design output includes mockups, token diff, component diff, and rationale.
- Engineering agents do not begin design implementation before this gate is approved.

Status (2026-07-02) — bundle refreshed, awaiting lead gate:

- Re-verified all bundle claims against `main`: Design Pass 1 (empty states, surface hierarchy, onboarding) is fully implemented — `EmptyState`/`Illustration` on 15 web routes + native twins, `SCREENS.md` real, warm-dark shipped, cover gradient tokenized, manifest hex fixed.
- `08-pain.md` → v3, `08-problems.md` → resolved/open split, `10-ask.md` → **Pass 2 draft**: (1) monetization surfaces design review, (2) admin operator UX, (3) motion vocabulary doc.
- `BRAND.md` logo section updated to the shipped wheat mark (`packages/ui-tokens/assets/logo-mark.svg`).
- Still `[HUMAN]`: mobile simulator snapshots, moodboard captures, fresh web snapshots for premium/saved/company.
- **Gate open:** lead must approve/override the Pass 2 ask before it goes to Claude Design; engineering implements nothing from it before approval (Sprint 28 gate).

## Sprint 28 - Design Foundation Implementation

Goal: implement the Claude Design platform's approved tokens and component changes.

Primary owners:

- UI tokens agent: `packages/ui-tokens`.
- Web atoms agent: `packages/ui-web`.
- Mobile atoms agent: `packages/ui-native`.
- QA agent: parity and a11y.

Scope:

- Apply approved token diffs only through the token package.
- Add or modify web/native atoms in lockstep.
- Keep `packages/ui-*` framework-neutral.
- Add focused tests for changed primitives.
- Update docs if component contracts change.

Done:

- Token lint is clean.
- Web/native primitive APIs match where parity is expected.
- No app route consumes raw design values.

## Sprint 29 - Design Surface Implementation

Goal: apply the approved design changes to product screens in controlled waves.

Primary owners:

- Web agent: Next.js surfaces.
- Mobile agent: Expo surfaces.
- QA agent: screenshots and interaction checks.
- Design agent: review against accepted mocks.

Scope:

- Implement design changes screen by screen, starting with highest-traffic authenticated surfaces.
- Suggested order: feed, profile, search, jobs, saved, monetization, network, messages, admin.
- Preserve functional behavior while replacing layout and states.
- Keep each page/component under the 300 LOC convention by splitting real subcomponents.

Done:

- Each changed screen has RTL and LTR screenshot evidence at mobile, tablet, and desktop widths where applicable.
- Empty, loading, error, offline, and success states are represented.
- No nested-card or hardcoded-token regressions.

## Sprint 30 - Launch Candidate QA

Goal: prove the app can be handed to actual users.

Primary owners:

- QA lead agent: test matrix and evidence.
- Release agent: deploy readiness.
- Web/mobile/API agents: bug fixes only.
- Project lead: final go/no-go.

Scope:

- Run the complete root gate, release gate, API readiness, web a11y, Playwright full flow, and mobile recovery check.
- Smoke the primary user journeys:
  - Register or log in.
  - Complete profile.
  - Search people, jobs, and companies.
  - Visit company page.
  - Connect and manage requests.
  - Post, react, comment, repost.
  - Message.
  - Save and unsave content.
  - Apply for a job.
  - Upgrade or attempt payment flow honestly.
  - Delete/export account.
  - Operator reviews a moderation report and billing receipt.
- Capture real-device evidence for push, deep links, offline/SSE resume, and mobile navigation.

Done:

- Open launch blockers are zero.
- Residual risks are documented and accepted by the project lead.
- The release branch is tagged as the launch candidate.

## Sprint Priority Rules

If two agents disagree, use this order:

1. User safety, privacy, and data integrity.
2. Auth, billing, and account lifecycle correctness.
3. Real product journeys over visual polish.
4. Web/mobile parity.
5. Claude Design platform output.
6. Nice-to-have polish.

## Backlog After Launch Candidate

These should not block the launch candidate unless the project lead explicitly promotes them:

- Redis-backed SSE fanout and rate-limit storage.
- Real virus/NSFW scanning pipeline.
- Native-speaker Arabic copy review beyond critical product and legal text.
- Broader cross-package dead-export cleanup with a workspace-aware tool.
- Additional employer analytics and reporting.
