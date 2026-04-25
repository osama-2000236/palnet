# Baydar Production Runbook

## Rollback

1. Identify the last good git tag or commit.
2. Render API: open the `palnet-api` service, select the last healthy deploy, and redeploy it.
3. Vercel web: open the Baydar web project deployments, select the last healthy deployment, and promote or roll back to it.
4. Verify `/api/v1/health/ready`, login, feed, messages, notifications, and legal pages.

## Database Migration Emergency

Use `pnpm --filter @palnet/db exec prisma migrate status` first. If a migration was applied manually or partially, use `prisma migrate resolve` only after confirming the database state and recording the incident note.

## Severity Ladder

- SEV1: total outage, data loss risk, auth unavailable, or unsafe moderation failure.
- SEV2: major workflow unavailable for a large user segment.
- SEV3: degraded performance, partial feature outage, or localized UX break.
- SEV4: cosmetic issue or low-impact operational task.

## On Call

Placeholder rotation: primary engineer, backup engineer, product owner.

## Third-Party Status Pages

- [Render](https://status.render.com)
- [Vercel](https://www.vercel-status.com)
- [Resend](https://status.resend.com)
- [Cloudflare](https://www.cloudflarestatus.com)
- [Expo](https://status.expo.dev)
- [Sentry](https://status.sentry.io)

## Observability

- Render logs: filter `palnet-api` for 5xx responses, readiness failures, cron failures, and Prisma errors.
- Sentry API dashboard: top non-domain errors and p95 route latency by release.
- Sentry web dashboard: route-level LCP, CLS, and client errors by release.
- Search FTS tradeoff: PostgreSQL `simple` config avoids new infrastructure but does not stem Arabic. Re-evaluate `pg_trgm` or managed search after launch.
