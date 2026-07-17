# Deployment

Baydar uses managed services so the pre-launch app can stay operational without a platform team.

## Topology

```text
Web users      -> Vercel Next.js app
iOS/Android    -> Expo/EAS builds
All clients    -> Render NestJS API (/api/v1)
API            -> Neon Postgres via Prisma
API            -> Cloudflare R2 for media
API            -> Expo push service for device notifications
Live updates   -> API-owned SSE streams
```

SSE is the active realtime transport for current app flows.

## Required Environments

### API

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`
- `INTERNAL_CRON_TOKEN`
- `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, `BAYDAR_WEB_URL`
- `R2_*`
- `CLAMAV_SCAN_URL`, `CLOUDFLARE_IMAGES_SCAN_URL`
- `HYPERPAY_ENTITY_ID`, `HYPERPAY_ACCESS_TOKEN`, `HYPERPAY_WEBHOOK_SECRET`
- `BANK_TRANSFER_IBAN`, `BANK_TRANSFER_BENEFICIARY`
- `SENTRY_DSN`, `SENTRY_RELEASE`
- `REDIS_URL` — optional; required only when running more than one API instance (shares custom rate-limit counters and SSE fanout across instances; unset = in-memory)
- Expo push and observability keys where enabled

### Web

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_DEFAULT_LOCALE`
- `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_RELEASE`
- PostHog public keys where enabled
- `BAYDAR_APPLE_TEAM_ID`
- `BAYDAR_ANDROID_SHA256_CERT_FINGERPRINTS`
- Optional overrides: `BAYDAR_IOS_BUNDLE_ID`, `BAYDAR_ANDROID_PACKAGE_NAME`

### Mobile

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_DEFAULT_LOCALE`
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_SENTRY_RELEASE`
- `EXPO_PUBLIC_POSTHOG_KEY`
- `EXPO_PUBLIC_POSTHOG_HOST`

## Service Setup

### Neon

- Project/database: `baydar`.
- Production branch: main.
- Preview branches may be used per PR.
- Run migrations with `pnpm --filter @baydar/db db:deploy`.

### Render API

- Build from the repo root so workspace packages are available.
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm --filter @baydar/api build`
- Start: `pnpm --filter @baydar/api start`
- Health: `/api/v1/health`

### Render Cron Jobs

Use the same `INTERNAL_CRON_TOKEN` as the API service and send it as `X-Internal-Token`.

```powershell
curl -X POST $API_URL/admin/internal/account-retention/run -H "X-Internal-Token: $INTERNAL_CRON_TOKEN"
curl -X POST $API_URL/admin/internal/karama-decay/run -H "X-Internal-Token: $INTERNAL_CRON_TOKEN"
curl -X POST $API_URL/admin/internal/media/scan -H "X-Internal-Token: $INTERNAL_CRON_TOKEN" -H "Content-Type: application/json" -d '{"key":"post_media/u_1/example.png","publicUrl":"https://media.baydar.ps/post_media/u_1/example.png","kind":"IMAGE","mimeType":"image/png"}'
```

Both `account-retention/run` and `karama-decay/run` accept an optional JSON body `{"dryRun":true}` for a no-write preview that reports what the run would do.

#### Scheduler contract

Both scheduled jobs are defined as Render cron services in `render.yaml`; the media scan endpoint is not a cron — it runs inline on `POST /media/confirm` after every upload, and the internal endpoint exists only for manual re-scans.

| Job                                    | Render service                  | Cadence (UTC)      | Endpoint                                     | Idempotency                                                                                                          | Timeout                                                                                            | Retry policy                                                                                                                                                                                               | Alert path                                                                                                                                                                                             |
| -------------------------------------- | ------------------------------- | ------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Account hard-delete after 30-day grace | `baydar-cron-account-retention` | daily 03:00        | `POST /admin/internal/account-retention/run` | Safe to re-run: only rows past the cutoff are deleted; an empty run is a no-op.                                      | Render cron default (job fails if the fetch throws; endpoint responds in seconds at launch scale). | No automatic retry. A missed day self-heals on the next daily run because eligibility is cutoff-based, not schedule-based. Manual re-run: trigger the cron from the Render dashboard or curl the endpoint. | Render cron failure notification (email to the service owner) + Sentry — the API logs a `warn` with the deleted count on every destructive run; absence of the daily log line is the secondary signal. |
| Monthly Karama decay                   | `baydar-cron-karama-decay`      | monthly, 1st 04:00 | `POST /admin/internal/karama-decay/run`      | Idempotent per calendar period: users already decayed this period are skipped, so re-runs within the month are safe. | Same as above.                                                                                     | No automatic retry. A failed run can be re-triggered any time in the same month with no double-decay risk.                                                                                                 | Same as above.                                                                                                                                                                                         |

Owner: the Render account owner (solo operator today). Both crons authenticate with `INTERNAL_CRON_TOKEN` (`sync: false` in `render.yaml` — set it in the Render dashboard to the same value as the API service).

#### Hard-delete dry-run evidence (pre-launch gate)

Before the first production retention run, capture evidence from staging:

1. Soft-delete a staging test account and backdate `deletedAt` beyond 30 days (or use an already-expired account).
2. `curl -X POST $STAGING_API_URL/api/v1/admin/internal/account-retention/run -H "X-Internal-Token: $INTERNAL_CRON_TOKEN" -H "Content-Type: application/json" -d '{"dryRun":true}'` — confirm the report lists the expected user ids with `"dryRun": true` and the row still exists.
3. Re-run without the body to execute the real delete; confirm `deletedCount` matches and the user row plus dependent rows are gone.
4. Save both JSON reports to `docs/evidence/` with the run date.

### Email Provider (decided: Resend)

The provider decision is closed — **Resend** is implemented in
`apps/api/src/modules/mail/resend.transport.ts`; dev/test fall back to the
console transport automatically. Migration plan to go live:

1. Create the Resend account and verify the sending domain (SPF + DKIM DNS
   records on `baydar.ps`).
2. Set `RESEND_API_KEY`, `MAIL_FROM`, and `MAIL_REPLY_TO` in the Render API
   environment (production boot hard-fails without the key).
3. Smoke on staging: trigger a password-reset email and confirm delivery +
   Arabic RTL rendering in a real inbox.
4. No code change is required; there is no dual-provider window because the
   console transport never ran in production.

### Vercel Web

- Root directory: `apps/web`.
- Install at repo root with pnpm.
- Build: `pnpm --filter @baydar/web build`.

### EAS Mobile

- Store production public env vars in EAS/GitHub secrets; `eas.json` must not contain placeholder values.
- Bind `apps/mobile` to the real EAS project id through `EXPO_PUBLIC_EAS_PROJECT_ID` before release.
- Use production profiles only after signing credentials and public env vars are configured.
- JS-only hotfixes can use EAS Update after project binding is real.

### Cloudflare R2

- Private buckets for media.
- Public reads should go through the approved media domain.
- API mints signed PUT URLs only after MIME and size validation.
- Post-upload scanner calls `POST /admin/internal/media/scan`; ClamAV and Cloudflare Images adapters decide `READY`, `BLOCKED`, or `REVIEW_REQUIRED`.

## CI/CD Gate

Required confidence commands:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @baydar/db generate
pnpm lint:tokens
pnpm check:release-placeholders
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
```

Web build and mobile Expo export checks should run before release candidates.

## Auth Transport (Phase 4 — new)

The API serves two auth-token transports off the same endpoints:

- **Cookie transport (default; web).** Login/register/refresh return
  the refresh token via `Set-Cookie: baydar_refresh=…; HttpOnly;
SameSite=Lax; Secure (prod); Path=/api/v1/auth`. The JSON body still
  contains a `refreshToken` field but it is redacted to an empty
  string — the cookie is the source of truth. Web `apiFetch` defaults
  to `credentials: 'include'`.
- **Body transport (mobile).** Clients send `X-Auth-Transport: body`
  on every request and receive the refresh token in the JSON body
  exactly as before. Mobile sets this header in
  `apps/mobile/src/lib/api.ts` so the existing SecureStore flow keeps
  working without a cookie jar.

`POST /api/v1/auth/logout` clears the cookie when the transport is
cookie; mobile logout stays a no-op against the cookie.

## Required Secrets at a Glance

See `.github/SECRETS.md` for the full list. (The former opt-in
`mobile-e2e` Maestro workflow was deleted — it was a non-functional
scaffold; `apps/mobile/.maestro/` flows remain for local runs.)

## Migrations

Run `pnpm --filter @baydar/db db:deploy` against each environment in
order: staging → production. The Phase 3 migrations
(`202605170001_perf_indexes_and_dedupe_key`,
`202605170002_fts_gin_indexes`) are forward-only and additive — every
new column is nullable + backfilled, every new index is created
without `CONCURRENTLY` and so will take a brief write lock proportional
to table size. For the launch dataset (< 100k rows in any table) the
lock window is sub-second.

## Production Pre-Flight Checklist

Before promoting a branch to production:

1. `pnpm install --frozen-lockfile && pnpm --filter @baydar/db generate`
2. `pnpm lint:tokens && pnpm format:check && pnpm lint && pnpm type-check`
3. `pnpm test` — expect 285+ passing tests (API + mobile + web).
4. `pnpm check:release-production` with production release env loaded.
5. `pnpm turbo run build --filter @baydar/web` — verify the bundle
   topology hasn't regressed.
6. Apply DB migrations to staging first, run `pnpm load:api:baseline`
   against staging, and compare p95 to the most recent
   `docs/perf-baseline-*.md` snapshot.
7. Smoke `/api/v1/auth/login` with and without `X-Auth-Transport: body`
   on the staging URL; confirm:
   - Without the header: `Set-Cookie: baydar_refresh=…` present,
     response body has `refreshToken: ""`.
   - With the header: no `Set-Cookie`, response body has the real
     refresh token.
8. Tag `v0.1.0-beta.1` only after the Deploy workflow has been green
   twice in a row on the target branch.
9. Open a manual `workflow_dispatch` deploy run with `target=production`
   and watch:
   - Migrate job: green.
   - Render API redeploy: `/api/v1/health` returns 200 within 60s.
   - Vercel web deploy: `/` returns 200 within 60s.
   - Sentry error rate flat for the first 15 minutes.

## Rollback

- **Web (Vercel).** `vercel rollback` to the previous deployment via
  the dashboard or CLI; DNS is not in the loop so this is instant.
- **API (Render).** Promote the previous successful deploy from the
  Render dashboard. The Phase 3 migrations are additive so rolling the
  code back without rolling the DB is safe.
- **Migrations.** Forward-only by policy. To undo, write a follow-up
  migration that drops or compensates rather than `prisma migrate
resolve --rolled-back`.

## On-Call Contacts

TBD before launch. Placeholder slots:

- API on-call: \<name / Slack handle\>
- Mobile on-call: \<name / Slack handle\>
- Status page: \<URL\>

## Current Release Caveats

- Confirm `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` return production metadata before public launch.
- Real-device push, deep-link, offline, and haptic evidence should be captured before public launch.
