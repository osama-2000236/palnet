# HANDOFF.md — Current State

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
- Sprint 17 closes F-03 search scope: web, mobile, shared contracts, and API now support people, posts, and jobs search. Companies search remains deferred until the F-04 company admin/management surface exists.
- Sprint 18 closes F-09 email verification and password recovery with hashed single-use tokens, console-only mail transport, web/mobile reset screens, and universal-link route entries.
- Sprint 19 closes the privacy HIGH gap for account deletion and data export with soft-delete, 30-day restore, anonymization, refresh-token revocation, synchronous JSON export, web settings UI, and a mobile settings surface.
- Sprint 11.5 fixed Expo monorepo bundle resolution, mobile runtime package gaps, API runtime package builds, mobile SSE auth header handling, NetInfo seed state, Sentry release tagging, push locale copy, and authenticated a11y fixture validation.

## Known Follow-Ups

- Real-device manual smoke evidence is still owed for refresh, deep links, push, haptics, offline/SSE resume, swipe archive, and cross-device messaging.
- Native Jest coverage now runs in the root test gate on Windows; branch coverage remains thin for `Icon`, `MessageBubble`, `Sheet`, `Skeleton`, and `PostCardSkeleton`.
- Arabic copy received AI-assisted cleanup but still needs a native human review before launch.
- Universal-link files are committed as drafts; replace Apple team ID and Android release SHA256 before production hosting.
- EAS project id and production Sentry/PostHog values remain environment-level release tasks.
- Admin moderation queue / report resolution UI remains a separate follow-up sprint.
- Company admin/management remains open from Sprint 12 audit F-04; do not add companies search until that surface ships.
- Real email provider integration remains deferred; choose Resend, SES, Postmark, or another provider before replacing the console transport.
- Safety-related privacy/legal copy still needs counsel review before launch.
- Account hard-delete after the 30-day restore grace period remains a follow-up scheduled job.
- Mobile account export sharing is blocked until `expo-sharing` is approved and installed.
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

## Cleanup Record

The April 28, 2026 cleanup intentionally removes generated local run artifacts, old agent worktrees, the unrelated root Layer2 report document, and all non-main branches after the docs commit is pushed. See `docs/repo-cleanup-2026-04-28.md`.

## Guardrails

- Do not redesign Baydar without updating `DESIGN.md` and the prototype decision record.
- Do not add new dependencies without checking existing monorepo packages first.
- Do not use Tailwind default color palettes in UI.
- Do not hardcode English UI copy.
- Do not reintroduce a legacy socket transport as the active realtime layer unless explicitly approved; current app flows use SSE.
