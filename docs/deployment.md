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
- Expo push and observability keys where enabled

### Web

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_DEFAULT_LOCALE`
- `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_RELEASE`
- PostHog public keys where enabled

### Mobile

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_DEFAULT_LOCALE`
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

For a no-write Karama preview, post JSON `{"dryRun":true}` to `/admin/internal/karama-decay/run`.

### Vercel Web

- Root directory: `apps/web`.
- Install at repo root with pnpm.
- Build: `pnpm --filter @baydar/web build`.

### EAS Mobile

- Bind `apps/mobile` to the real EAS project id before release.
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
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
```

Web build and mobile Expo export checks should run before release candidates.

## Current Release Caveats

- Universal-link files contain placeholders until Apple team ID and Android release fingerprint are set.
- EAS project id remains a release binding task.
- Real-device push, deep-link, offline, and haptic evidence should be captured before public launch.
