# HANDOFF.md — Current State

> **⚠️ SUPERSEDED 2026-07-02.** The live status document is `docs/HANDOFF-FABLE5-2026-07.md`. Monetization UI C1–C7 shipped in PR #38; this file's "remaining C1–C4/C7" status below is stale. Keep this file as history only.

> **2026-06-13 update — reconciled with `docs/HANDOFF-FABLE5.md`.** F-04 company admin is closed, companies search is now shipped, and monetization C5/C6 are implemented. Remaining monetization UI is C1–C4 plus broader C7 parity/review.

> Read after `project-spec.md`, `DESIGN.md`, and `BRAND.md`.

## Current Baseline

- Branch of record: `main`.
- Current committed baseline before this docs cleanup: `1318d43 chore: align hoist + lint config to fix lint CI gate`.
- Product: Baydar (بيدر), Arabic-first and RTL by default.
- Stack: Next.js 15 web, Expo SDK 54 / React Native 0.81 mobile, NestJS REST API, Prisma/Postgres, SSE live updates, JWT refresh auth, R2 media, Expo push.

## Shipped Through Sprint 11.5

- Shared token system is olive/terracotta and enforced by `pnpm lint:tokens`.
- `@baydar/ui-web` and `@baydar/ui-native` contain the core atoms and row/card primitives used by current screens.
- Web app has AppShell, feed, profile, network, messages, notifications, search, jobs list/detail, authenticated layouts, public auth routes, and accessibility smoke coverage for public pages.
- Mobile app boots in RTL with bundled Arabic fonts, Expo Router, bottom tabs, tokenized shared UI primitives, feed/profile/network/search/messages/notifications/jobs flows, deep links, push-device registration, haptics, offline banner, pull-to-refresh, and Expo Go guardrails.
- API has auth, profiles, feed/posts/comments/reactions/reposts, connections, messages, notifications/devices, jobs/applications, safety reports/blocks, media upload URL generation, health, and supporting shared Zod contracts.
- UGC safety is wired end-to-end on web and mobile: report, block, unblock, and blocked-users management call the Sprint 14 safety endpoints.
- Sprint 17 closes F-03 search scope, amended 2026-06-13: web, mobile, shared contracts, and API now support people, posts, jobs, and companies search. Companies search links to the employer/company surface now that F-04 shipped.
- Sprint 18 closes F-09 email verification and password recovery with hashed single-use tokens, console-only mail transport, web/mobile reset screens, and universal-link route entries.
- Sprint 19 closes the privacy HIGH gap for account deletion and data export with soft-delete, 30-day restore, anonymization, refresh-token revocation, synchronous JSON export, web settings UI, and a mobile settings surface.
- Sprint 20 closes the security hardening slice for one-time SSE stream tokens, web CSP/security headers, route-level rate-limit decorators, strict media presign MIME/size checks, and production CORS origin validation.
- Sprint 21 closes F-10 notification dismissal with owner-only soft-dismiss and F-11 mobile tab polish with five visible tabs, AppHeader search access, web/mobile dismiss UI, account export sharing, and shared toast primitives.
- Sprint 11.5 fixed Expo monorepo bundle resolution, mobile runtime package gaps, API runtime package builds, mobile SSE auth header handling, NetInfo seed state, Sentry release tagging, push locale copy, and authenticated a11y fixture validation.

## Repo Optimization (Phases 3–7)

Tracked separately in PR #30 against `main`.

- Phase 3 (DB + Prisma hot paths): composite indexes on `Notification`,
  `Post`, `Connection`, `ChatRoomMember`; `dedupeKey` column on
  `Notification`; `lastReadMessageId` cursor on `ChatRoomMember`; GIN
  tsvector FTS indexes on Profile/Post/Job using the `simple`
  dictionary (closes #7). Feed, messaging, notifications, and search
  rewritten to single batched queries.
- Phase 4 (API correctness + security): httpOnly refresh cookie path
  for web (mobile keeps body transport via `X-Auth-Transport: body`);
  `compression` middleware over JSON; production CORS hard-fail on
  empty `CORS_ORIGINS`; `@Throttle` on every public auth route;
  `RateLimitBackend` interface + lazy TTL sweep; strict media
  extension whitelist; explicit single-source CSP via middleware.
- Phase 5 (web perf): `next/image` migration (5 raw `<img>`),
  `QueryClient` singleton pattern, `(auth)/loading.tsx`, Tailwind
  content glob narrowed to `ui-web/dist` in production.
- Phase 6 (test coverage + Maestro): seven API service spec backfills
  (Reactions, Reposts, Comments, Ratings, Companies, AdminModeration,
  Mail) + minimal web Jest via `next/jest`; mobile Maestro scaffold
  with three smoke flows and an opt-in `workflow_dispatch` CI job.
  Test total now 285 across the repo.
- Phase 7 (cleanup): `typescript` pinned to `~5.9.2` across every
  package; `pnpm dedupe` applied; docs refreshed.

## Known Follow-Ups

- Real-device manual smoke evidence is still owed for refresh, deep links, push, haptics, offline/SSE resume, swipe archive, and cross-device messaging.
- Arabic copy received AI-assisted cleanup but still needs a native human review before launch.
- Universal-link files are committed as drafts; replace Apple team ID and Android release SHA256 before production hosting.
- EAS project id and production Sentry/PostHog values remain environment-level release tasks.
- Admin moderation and billing-review queues have localized web surfaces at `/moderation` and `/billing` under the admin route group. They still need operator QA and design-platform review before launch operations.
- ~~Company admin/management remains open from Sprint 12 audit F-04~~ **CLOSED:** PR #25 (`0bebf5a`) shipped `apps/api/src/modules/companies/` (controller, service, company-jobs, company-members, role guard), registered in `app.module.ts`.
- **Monetization UI:** C5 Karama-as-payment and C6 skill endorsement are implemented on web and mobile against the existing checkout/profile endpoints. C1 `/me/premium`, C2 checkout method picker, C3 employer billing, C4 invoices/receipt upload, and C7 full parity polish remain.
- Real email provider integration remains deferred; choose Resend, SES, Postmark, or another provider before replacing the console transport.
- Safety-related privacy/legal copy still needs counsel review before launch.
- Account hard-delete after the 30-day restore grace period has a service and internal endpoint: `POST /admin/internal/account-retention/run` with `x-internal-token`. Production scheduler wiring remains an environment/deployment follow-up.
- `/me/connections` now routes to the existing network manager on web and mobile. `/saved` now has a real bookmark model, API module, web route, mobile route, and save/remove affordances for posts/jobs.
- Redis-backed SSE fanout + rate-limit storage and virus/NSFW scanning remain deferred; the `RateLimitBackend` interface introduced in Phase 4 lets a Redis impl drop in without further consumer churn.
- Cross-package dead-export sweep is intentionally deferred: `ts-prune` against a single tsconfig flags every `@baydar/shared` export as unused because cross-package usage isn't visible; revisit with a workspace-aware tool (e.g. `knip --workspaces`).
- Sprint 15 safety test follow-ups are closed by Sprint 16: ui-web/ui-native safety primitives now have behavior coverage, mutation spot-check evidence was captured, and the Playwright safety e2e has an explicit Windows EPERM guard for invocable local runs.

## Verification Snapshot

Use these commands as the default confidence gate:

```powershell
pnpm install --frozen-lockfile
pnpm lint:tokens
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm --filter @baydar/db generate
```

Expected state on the cleaned repo: all commands pass. `pnpm lint` may print import-order warnings only if they remain non-fatal in the current ESLint config.

## Claude Review Notes

- Review and enhance C5/C6 implementation: `apps/web/src/app/[locale]/(app)/me/karama/page.tsx`, `apps/mobile/app/(app)/me/karama/index.tsx`, profile skills panels, and `POST /profiles/:handle/skills/:skillId/endorse`.
- Review companies search relevance and result presentation now that `/search/companies` is live on API, web, and mobile.
- Review admin operator surfaces: localized moderation at `/moderation` and bank-transfer billing review at `/billing` now use refresh-safe auth and shared web atoms, but still need operator UX/design pass.
- `/saved` is no longer a placeholder gap; keep future work on top of the `Bookmark` model and `/bookmarks` contract.
- Confirm production cron infrastructure calls `POST /admin/internal/account-retention/run` with `INTERNAL_CRON_TOKEN`; code path exists, scheduler config is outside the app.

## Cleanup Record

The April 28, 2026 cleanup intentionally removes generated local run artifacts, old agent worktrees, the unrelated root Layer2 report document, and all non-main branches after the docs commit is pushed. See `docs/repo-cleanup-2026-04-28.md`.

## Guardrails

- Do not redesign Baydar without updating `DESIGN.md` and the prototype decision record.
- Do not add new dependencies without checking existing monorepo packages first.
- Do not use Tailwind default color palettes in UI.
- Do not hardcode English UI copy.
- Do not reintroduce a legacy socket transport as the active realtime layer unless explicitly approved; current app flows use SSE.
