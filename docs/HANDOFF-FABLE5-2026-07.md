# HANDOFF — Fable 5 High-Effort Session Brief (2026-07-02)

> **Audience:** Claude Fable 5 (high effort), taking over Baydar to make it launch-ready for real users.
> **Read order:** `CLAUDE.md` → `project-spec.md` → `DESIGN.md` → `BRAND.md` → `docs/HANDOFF-FABLE5.md` (June brief, still mostly valid) → **this file** (supersedes both handoffs on current status).
> **Branch of record:** `main` @ `f4be7b3`. Verified 2026-07-02 in worktree `sad-euler-f8602d`.

---

## 1. What changed since the June brief (`docs/HANDOFF-FABLE5.md`)

The June brief listed Monetization UI C1–C4/C7 as the headline deliverable. **That work shipped.** Commits since:

- **PR #38 (`a326ca5`)** — web-mobile parity + release QA: `GET /billing/catalog` (viewer-priced) + `GET /billing/me`, web `/me/premium` plan comparison + full checkout flow (card redirect, bank-transfer IBAN, Karama points, wallets disabled as coming-soon), native twin on mobile, billing plan-id schema fix (seeded readable ids vs cuid — was 500ing every billing read), premium-page auth-refresh fix.
- **PR #39 (`9ee1889`)** — deploy workflow: isolated mobile release-metadata gate; credential-free iOS QA build profile in `eas.json`.
- **PR #40 (`da6a7c0`)** — decoupled Vercel production deploy in `deploy.yml`.
- **PR #41 (`f4be7b3`)** — restored public legal route aliases on web.
- Also on main: warm-dark theme (`ab981a0`), mobile tab-history/internal-route fixes, staging CORS + preview-build API URL fixes, forwarded-HTTPS cookie trust, onboarding connection suggestions fix.

Per `design-handoff-2026-06/README.md` parity ledger: **all rows Yes/Yes** — auth/onboarding, feed+safety, search+company, jobs, profile+skills+Karama, personal premium, employer billing, moderation (admin web + reporter both), warm light/dark theme.

## 2. Verified gate state (this session, 2026-07-02)

Run in a fresh worktree off `f4be7b3`:

| Check                               | Result                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`    | green                                                                                                                                       |
| `pnpm --filter @baydar/db generate` | green — **must run before type-check/test in a fresh clone**, otherwise `@baydar/db` fails with `TS2305: no exported member 'PrismaClient'` |
| `pnpm lint:tokens`                  | green                                                                                                                                       |
| `pnpm lint`                         | green                                                                                                                                       |
| `pnpm type-check`                   | 13/13 green                                                                                                                                 |
| `pnpm test`                         | **all green: shared 19, web 20, api 260, mobile 84 = 383 tests** (previously flaky `onboarding-flow.test.tsx` passed this run)              |
| `pnpm check:release-placeholders`   | clean                                                                                                                                       |

## 3. Bugs / problems found this session

> **Status update (same session, 2026-07-02): §3.1 and the AppShell item in §3.2 are FIXED on this branch.**
>
> - i18n: dead mismatched keys pruned from `en.json`/`ar-PS.json` (`onboarding.success`, `feed.rail.saved`, top-level `connections` — verified consumed by no code), dead `apps/web/messages/ar.json` deleted, the two `ACCOUNT_DELETED*` strings added to mobile `en.json` (real runtime bug — `api-errors.ts` renders `api.errors.${code}`). Key-set parity now 0/0 both apps.
> - Drift guard: `apps/web/src/lib/__tests__/messages-parity.test.ts` + `apps/mobile/src/__tests__/i18n-parity.test.ts` fail CI on any future key drift.
> - AppShell (ui-native): search pill is a real button firing new optional `onSearchPress` (native hands off to host search screen per MOBILE.md), profile trigger fires `onViewProfile` (web-twin prop name). Covered by `packages/ui-native/src/__tests__/AppShell.test.tsx`.
> - Docs: `HANDOFF.md` and `HANDOFF-FABLE5.md` carry superseded banners pointing here.
>
> The subsections below are kept as found-state record.

### 3.1 i18n gaps in the DEFAULT locale (launch bug — Arabic-first rule)

Web live locales are only `ar-PS` (default, RTL) and `en` (`apps/web/src/i18n.ts`). Key-parity audit:

- **`apps/web/messages/ar-PS.json` is missing 10 keys that exist in `en.json`:**
  `onboarding.success.title|body|goToFeed`, `feed.rail.saved`, `connections.title|subtitle`, `connections.tabs.accepted|pending`, `connections.connections.empty|emptyDesc`.
  → Onboarding success screen and connections surfaces degrade in the default Arabic locale. Direct violation of the Arabic-first hard rule.
- `en.json` missing 2 keys present in ar-PS: `feed.rail.saved.title|subtitle` (note the shape conflict with `feed.rail.saved` string key in en — reconcile the shape, not just copy).
- **`apps/web/messages/ar.json` is a dead file** — not in the `locales` array, 139 keys stale vs en. Delete it or wire it; today it's a trap for editors.
- Mobile `en.json` missing 2 keys: `api.errors.ACCOUNT_DELETED_PENDING_RESTORE`, `api.errors.ACCOUNT_DELETED`.
- **Enhancement:** add a CI test that fails on locale key drift (flatten + set-diff across ar-PS/en and mobile ar/en). Trivial to write; this class of bug never returns.

### 3.2 Known code TODOs still open (verified present)

- `packages/ui-native/src/AppShell.tsx:105` — search is a fake placeholder (no real `TextInput`); `:157` — profile menu unimplemented. Only real UI TODOs in shared packages. Check whether app-level screens bypass these before "fixing" — mobile has a real search screen at `app/(app)/search.tsx`; the AppShell affordance may just need to route there.
- `apps/api/src/modules/billing/currency.ts` — hardcoded FX snapshot, TODO live rate feed. Acceptable for beta; display shows USD original alongside.
- ~~`apps/api/src/modules/billing/employer-entitlements.service.ts:23` — residual race window on the under-limit fast path.~~ **FIXED 2026-07-05:** `CompaniesService.createJob` now wraps limit check + credit spend + job insert in one transaction holding a per-company `pg_advisory_xact_lock`; also closes the credit-spent-but-create-failed leak.
- Wallet clients (`jawwalpay|palpay|reflect.client.ts`) throw NOT_IMPLEMENTED by design until merchant onboarding — UI correctly shows coming-soon. Do NOT fake success.

### 3.3 Docs drift (again)

`docs/HANDOFF.md` and `docs/HANDOFF-FABLE5.md` both predate PRs #38–41 and still describe C1–C4/C7 as open. Reconcile them (or mark them superseded by this file) so there is one source of truth.

## 4. Launch blockers (environment/ops, not code)

Code paths exist; these are configuration/evidence tasks. `apps/api/src/config/env.ts` hard-fails production boot without: `CORS_ORIGINS`, `RESEND_API_KEY`+`MAIL_FROM`, `BAYDAR_WEB_URL`, `INTERNAL_CRON_TOKEN`, HyperPay trio, bank-transfer IBAN+beneficiary, `CLAMAV_SCAN_URL`+`CLOUDFLARE_IMAGES_SCAN_URL`, `SENTRY_DSN`+`SENTRY_RELEASE`. So production API literally cannot start until these are provisioned.

1. **Secrets provisioning** — Render (see `render.yaml`), Vercel env, GitHub environments (staging/production), EAS secrets. Full list: `docs/deployment.md`, `.github/SECRETS.md`.
2. **HyperPay merchant onboarding** — card checkout is redirect-based; needs real entity id/token/webhook secret. Until then only bank-transfer + Karama points are real payment paths.
3. **Media scanning endpoints** — ClamAV / Cloudflare Images scan URLs required in prod; stand these up or relax the env gate consciously.
4. **Universal links** — `/.well-known/apple-app-site-association` + `assetlinks.json` are drafts; need real `BAYDAR_APPLE_TEAM_ID` + `BAYDAR_ANDROID_SHA256_CERT_FINGERPRINTS`.
5. **EAS project id + signing credentials**; production Sentry/PostHog values. `check:release-production` gate enforces these in the deploy workflow.
6. **Render cron** — account retention (daily 03:00) and karama decay (monthly, 1st 04:00) are both defined in `render.yaml` as of Sprint 26; media scan is not a cron (inline on `POST /media/confirm`). Confirm both cron services exist in the live Render account with `INTERNAL_CRON_TOKEN` set. Retention endpoint now supports `{"dryRun":true}` for the staging evidence step (scheduler contract: `docs/deployment.md`).
7. **Real-device smoke evidence** — refresh, deep links, push, haptics, offline/SSE resume, swipe archive, cross-device messaging. Owed since Sprint 11.5.
8. **Native-speaker Arabic copy review** and **legal/privacy counsel review** — human tasks, still open.
9. **Staging perf baseline** — `pnpm load:api:baseline` vs `docs/perf-baseline-*.md` per pre-flight checklist in `docs/deployment.md`.

## 5. Enhancement backlog (post-blocker, prioritized)

1. ~~**Locale-drift CI test** (§3.1)~~ — **done 2026-07-02** (parity tests on web + mobile).
2. ~~**AppShell native search + profile menu** (§3.2)~~ — **done 2026-07-02** (`onSearchPress`/`onViewProfile` callbacks).
3. **Operator QA for `/moderation` and `/billing` admin surfaces** — shipped + localized, never operator-tested.
4. ~~**Redis-backed rate-limit + SSE fanout**~~ — **done 2026-07-05 (PR #53):** `REDIS_URL` env-gated; `RedisRateLimitStore` (Lua fixed window, fail-open) bound to the `RateLimitStore` token by factory, `MessagingBus`/`NotificationsBus` delegate to a shared `Fanout` (local or Redis pub/sub). Unset = in-memory, unchanged. ~~Note: `@nestjs/throttler` (auth routes) storage is still per-instance.~~ **Closed 2026-07-14:** `RedisThrottlerStorage` (`apps/api/src/modules/rate-limit/redis-throttler.storage.ts`, Lua fixed window + block key, fail-open) is bound via `ThrottlerModule.forRootAsync` when `REDIS_URL` is set; unset keeps the bundled in-memory store.
5. ~~**Live FX feed** for `billing/currency.ts`~~ — **done 2026-07-14:** `FxService` (`apps/api/src/modules/billing/fx.service.ts`) overlays USD-relative rates from optional `FX_FEED_URL` (shape `{ rates: { ILS: 3.6 } }`, e.g. open.er-api.com/v6/latest/USD) on the hardcoded snapshot, lazy 6h refresh on the read path, feed failure keeps last known rates. Unset env = snapshot behavior, unchanged.
6. **Real email provider is DONE in code** (Resend transport in `apps/api/src/modules/mail/resend.transport.ts`, console fallback dev/test) — only the API key remains (see §4.1). Older docs saying "console-only" are stale.
7. ~~**Workspace-aware dead-export sweep** (`knip --workspaces`)~~ — **investigated and rejected 2026-07-05:** knip 6.24 fails to load the metro/next jest configs in this monorepo; 6 of 11 spot-checked "unused" web exports were false positives. Do not rerun without investing in per-workspace `knip.json` — payoff too small. (The sweep did surface one real gap, shipped as PR #54.)
8. ~~Stabilize `apps/mobile/src/__tests__/onboarding-flow.test.tsx`~~ — **done 2026-07-05** (30s suite timeout; the flow test is integration-scale, 5s Jest default was the flake).
9. **Email verification send affordance — done 2026-07-05 (PR #54):** Sprint 18 shipped confirm pages + `POST /auth/verify-email/send`, but no client could trigger the send. `GET /auth/me` now returns `emailVerified`; Settings → Account on web and mobile shows a verified badge or a send-verification CTA.
10. **Enhancement sprint 2026-07-05** (PR #52): `/account/restore` gained login-parity brute-force throttle (5/hour) and `applyAuthTransport` (web HttpOnly refresh cookie, mobile body transport — was leaking refresh token into web response body); login screens on web + mobile now show a "استعادة الحساب والدخول" CTA when login fails with `ACCOUNT_DELETED_PENDING_RESTORE` (previously a dead-end error with no restore UI anywhere). Audits run clean: all list endpoints paginated, no RTL-physical CSS, no hardcoded hex outside tokens, error/loading boundaries complete, guard/throttle coverage verified (webhook signature-checked, internal routes token-gated, company billing role-gated).

## 6. Deploy runbook (as wired today)

- **CI:** `.github/workflows/ci.yml`; deploy: `deploy.yml` — push to `main` = gate → migrate staging (Neon) → Render staging hook + Vercel preview. Production only via manual `workflow_dispatch` `target=production` (+ optional `submit_mobile=true` for EAS build+submit). Mobile QA: credential-free iOS build profile in `eas.json` (PR #39).
- Full pre-flight checklist + rollback: `docs/deployment.md` (§Production Pre-Flight, §Rollback).
- Owner has **no Vercel CLI/token locally** — production pushes go through the GitHub workflow, not local CLI.

## 7. Mission framing for this session

Bar is unchanged from June brief §6: every primary action (sign up → profile → connect → post → message → job → apply → upgrade) works end-to-end with real loading/empty/error/offline states. Code is essentially there; the remaining distance to real users is (a) the §3 bugs, (b) the §4 env/ops provisioning, (c) evidence (real-device smoke, staging soak, operator QA). Suggested order: fix §3.1 i18n + drift test → reconcile docs → walk §4 with the owner (most items need his accounts/credentials — HyperPay, Apple, Render, Resend) → staging soak → production dispatch.

Hard borders unchanged (`CLAUDE.md` law): tokens only, RTL-safe logical CSS, Arabic-first, web↔mobile lockstep, framework-neutral `ui-*`, no viewer-scoped public caching, no placeholder production routes, SSE stays the realtime transport, design work routes to the Claude Design platform channel (`design-handoff-2026-06/`).

## 8. Fresh-clone gotcha

Always run `pnpm --filter @baydar/db generate` immediately after install and before `type-check`/`test`. HANDOFF.md's verification snippet lists it last — it must be first; skipping it fails the whole gate with a misleading Prisma type error.

## 9. Ponytail audit session (2026-07-14)

Repo-wide over-engineering audit; cuts applied on branch `claude/ponytail-audit-scopes-1ad1f5`:

- **Deleted dead code:** `packages/ui-web/src/Menu.tsx` (189 lines, zero consumers, no native twin), `scripts/capture-snapshots.mjs`, `scripts/check-api-readiness.mjs`, `tools/agentflow/baydar_mobile_qa_pipeline.py` — all unreferenced.
- **Deleted dead deps:** web `@next/bundle-analyzer` + `next-bundle-analyzer` + `cross-env` + the `bundle:analyze` script (`next.config.mjs` never wired either analyzer; `ANALYZE=true` was a no-op). Root/package `rimraf` replaced with `node -e "require('fs').rmSync(...)"` clean scripts. Api `pino-pretty` moved to devDependencies (only loads when `NODE_ENV!=="production"`).
- **Wallet clients collapsed:** `jawwalpay|palpay|reflect.client.ts` (3 near-identical stub classes) folded into a data table inside `wallet-registry.ts`. Same NOT_IMPLEMENTED/coming-soon semantics, same env keys; a real client class replaces its table entry when merchant onboarding lands.
- **Deferred, deliberately:** archiving `design-handoff-2026-05/` (83 doc references, churn > value — revisit if the tree bothers anyone); unused ui-native twins are lockstep policy, not bloat.
- **Also shipped this session:** Redis throttler storage (backlog #4 note) and live FX feed (backlog #5) — see above.
- **Operator QA done (2026-07-14):** ran API+web against local `palnet` Postgres, exercised `/moderation` (dismiss) and `/billing` (mark-paid, audit trail verified in DB: `reviewedById`/`reviewedAt` set, `ModerationAction` row logged). Fixes shipped from findings: moderation dates now locale-formatted (were `en-US` hardcoded via bare `toLocaleString`), reports list enriched with reporter name/handle + reported-post excerpt + deleted flag (operators saw only cuids), MARK_PAID now confirm-gated (money action fired on single click), admin route group gained a nav bar (moderation ⇄ billing ⇄ back to app; billing link ADMIN-only). A `qa-admin@baydar.test` ADMIN user (Password123) remains in the local dev DB for future operator QA; QA fixture reports/invoices were deleted. Env note: local API boot needed ≥32-char JWT secrets (root `.env.local` has 28/29-char ones — use `.env.qa.local` values) and `loadEnv` now treats empty-string env vars as unset (blank values from dashboards/templates no longer fail optional url/min validators at boot).
- **Closed 2026-07-14 (second pass):** billing review DTO enrichment — `AdminInvoice` (shared) extends `Invoice` with `userEmail`/`userName`/`companyName`, admin list endpoint joins payer identity, `/billing` renders names with cuid fallback (verified live: "ديمو المستخدم (demo@baydar.ps)"). Sentry wired — api `@sentry/node` init in `main.ts` behind `SENTRY_DSN` + `captureException` in `AllExceptionsFilter` unhandled branch; web `@sentry/nextjs` via `src/instrumentation.ts` (nodejs runtime, `onRequestError`) + `src/instrumentation-client.ts`, behind `NEXT_PUBLIC_SENTRY_DSN`; CSP already whitelisted `*.ingest.sentry.io`. No DSN = no-op, verified. Skipped: source-map upload / `withSentryConfig` (needs org auth token — env/ops) and edge-runtime init (ponytail note in instrumentation.ts).
- **AppShell key warning (dev-only):** reproduced — fires twice on AppShell mount right after login in dev (strict mode double render). Not reproducible in a jsdom mount of `AppShell` with full props, and no unkeyed `.map`/fragment-array exists in AppShell/Nav/ProfileMenu/Search source. Needs React DevTools component stack on a real session to localize; cosmetic, invisible in prod builds — parked deliberately.
- **Closed 2026-07-14 (third pass):** turbo output warnings (test task no longer claims `coverage/**` nobody consumes; `packages/ui-native/turbo.json` overrides build outputs to `[]` since its build is `tsc --noEmit`) and the billing spec import-order lint annotation. Admin ops round 2 — `/billing` gained status filter tabs (needs-review / paid / voided / all; action buttons only on actionable rows, review notes shown on history rows, inline receipt thumbnail via `next/image` for media.baydar.ps / R2 hosts), `/moderation` gained open/resolved tabs (resolved rows show localized resolution date + note, read-only). All verified live against local stack with multi-state fixtures.
- **Staging soak (attempted 2026-07-14, owner-gated):** Deploy workflow staging jobs are green (migrate + Render hook + Vercel preview), but the staging API hostname exists only in `RENDER_STAGING_DEPLOY_HOOK` secret — `baydar-api(-staging).onrender.com` guesses return Render no-server 404s. Owner: record the real staging URL in `docs/deployment.md`, then run pre-flight steps 6–7 (`pnpm load:api:baseline` + login transport smoke) against it.
- **Still open:** §4 env/ops blockers (owner accounts — HyperPay, Resend, Render cron, EAS, Sentry DSN values, real-device smoke).

## 10. Ponytail audit session 2 (2026-07-15)

Second repo-wide over-engineering pass on branch `claude/ponytail-audit-scopes-e23878`, followed by scope-by-scope digs:

- **S1 — cuts applied:** root `playwright` devDep (zero imports; web e2e uses `@playwright/test`), mobile `lucide-react-native` (zero references; icons are `@expo/vector-icons` + custom `Icon`), web `clsx` + `tailwind-merge` (zero imports in `apps/web/src`; ui-web owns its copies), `apps/web/scripts/mobile-lighthouse.mjs` + its `lighthouse` script (190 lines duplicating the CI lhci job). Net −4 deps, −200 lines. Verified: lint:tokens, type-check 13/13, web jest 21, mobile lint.
- **S2 — guard gaps closed:** `ci.yml` lint job now runs `pnpm lint:tokens`, `pnpm qa:design`, `pnpm check:release-placeholders` (previously deploy-only / nowhere; `qa:design` had rotted red while dark — `settings/account.tsx` was 307 LOC, shrunk honestly to 298 via badge/danger-title style merges + inlining `formatJson`). Note: qa-design's LOC counter counts trailing-newline splits, so the effective ceiling is 299 physical lines.
- **S3 — Expo web target cut:** mobile `react-native-web`, `react-dom`, `@types/react-dom`, the `web` script, and app.config `web` block removed — product web is Next.js; `@expo/metro-runtime` kept (unconditional import in `expo-router/entry-classic`). Verified: full mobile jest 33 suites / 91 tests green, mobile type-check + lint green, `check:native-versions` + `check:duplicate-imports` clean.
- **S4 — skipped deliberately:** local perf smoke already recorded 2026-07-14 (`docs/perf-baseline-2026-07-14-local.md`); nothing in this session touches API runtime. Remaining rerun is staging (owner-gated on the real staging URL).
- **S5 — AppShell key warning FIXED (was parked in §9):** root cause found via live A/B against local stack: the `(app)` layout passed `[ConnectivityBanner, children]` into AppShell; the RSC page element in `children` carries no key, and React 19 re-validates that array while reconciling AppShell's `<div>{children}</div>` (fragments get unwrapped, so a fragment doesn't help; keying the banner doesn't either). Fix: wrap both in a plain `<div>` so AppShell receives one client-created child. Verified live: pre-hydration console hook on `/ar-PS/feed` records zero key warnings post-fix (was 1–2 per mount), feed renders normally. The warning's `%s` args are empty in React 19 — `captureOwnerStack()` + `new Error().stack` inside an in-bundle console hook was the tool that finally localized it (stack: `warnForMissingKey → reconcileChildrenArray` under AppShell's div).
- **Dev note:** post-login redirect can take >6s on a cold dev compile of the `(app)` segment — it looks like a stall but completes; not a product bug (verified same behavior on unmodified code, and eventual navigation to `/ar-PS/feed`).
- **Audit deferrals unchanged:** `design-handoff-2026-05/` stays (churn > value), superseded HANDOFF docs stay as banner-marked history, `format.ts` Intl fallback stays (Hermes PluralRules gap makes the runtime check load-bearing).

## 11. Product-depth session (2026-07-16)

Market-fit scope group after ponytail audit 3 (PR #61 cut `design-handoff-2026-05/code/`, dead components, locale-correct session times). Grounded in Jobs.ps facet analysis (location/industry/experience; NGO jobs headline category):

- **S1 — Arabic-folded search (shipped):** `baydar_fold()` SQL function + rebuilt Profile/Post/Job FTS GIN indexes on the folded expression (migration `202607160001_arabic_search_folding`), all four search endpoints fold doc+query, jobs-list `q` swapped from naive `contains` to a folded-ILIKE prefilter (substring semantics kept, LIKE wildcards escaped), excerpt highlighting position-safe-folds, `normalizeCity` folds (قلقيليه → قلقيلية). JS twin `foldArabic()` in `packages/shared/src/arabic-fold.ts` — **must stay equivalent to the SQL function** (see docs/localization-palestine.md §Arabic Search Folding). Verified live: fold outputs identical SQL↔JS, hamza/teh-marbuta/tashkeel matches all true, planner uses `Profile_fts_idx` (Bitmap Index Scan).
- **S2 — University suggestions (shipped):** `PS_UNIVERSITIES` (previously consumed by nothing) wired as school suggestions — web `<datalist>` in the education editor, mobile fold-filtered Chip row (`SchoolSuggestions` in EducationsCard). Canonical Arabic written; free text stays.
- **S3 — Jobs sector facet (shipped):** `PS_INDUSTRIES` (16 sectors, NGO/intl-org first) in shared palestine.ts; `GET /jobs?industry=` filters via company-join contains-insensitive; web JobFilters native select + mobile FilterSheet chips; employer/new industry input gained the canonical datalist; `jobs.industry` key in all four locale files (parity green).
- **Fix found live:** `/me/edit` basics form rendered raw `onboarding.firstName`/`onboarding.lastName` keys (the `as never` casts had silenced next-intl's missing-key type error). Keys added to both web locales, casts removed.
- **Env note:** local `palnet` DB has the folding migration applied; staging/prod get it on next `migrate deploy` (no data backfill needed — indexes rebuild in the migration). Live-QA fixtures kept in the local DB: `qa-ahmad@baydar.test` (profile "أحمد خليل"), companies `qa-ngo-org` (NGO industry) / `qa-tech-co` (tech) with one Arabic job each — used to verify folding + the sector facet end-to-end.
