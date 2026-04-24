# Deployment

Zero-devops path. Every hosted piece is a managed service with a generous free tier so a solo builder can ship on day one.

## Topology

```
Users
  │
  ├── Web         → Vercel (Next.js)           custom domain: palnet.ps
  ├── iOS/Android → App Store / Play Store     built by EAS
  └── (admin)     → Vercel (same Next.js app, /admin route, RBAC)

All clients → api.palnet.ps (Render) ←→ Neon (Postgres)
                                    ←→ Cloudflare R2 (media)
                                    ←→ Render Redis/Key Value (optional throttling)
                                    ←→ authenticated SSE streams on the same API service
```

## Environments

| Env       | API                | Web            | DB                 | Notes                     |
| --------- | ------------------ | -------------- | ------------------ | ------------------------- |
| `dev`     | localhost:4000     | localhost:3000 | Neon dev branch    | per-developer Neon branch |
| `preview` | Render preview env | Vercel preview | Neon branch per PR | automatic on PR open      |
| `prod`    | Render service     | Vercel prod    | Neon main branch   | manual promote            |

## First-time Setup (runbook)

### 1. Secrets

- Render: `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, optional `REDIS_URL`, `R2_*`, `GOOGLE_*`.
- Vercel: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`.
- EAS: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DEFAULT_LOCALE`.
- `NEXT_PUBLIC_WS_URL` / `EXPO_PUBLIC_WS_URL` are deprecated compatibility vars for beta. Clients derive SSE URLs from the API base instead.
- Never commit `.env.local`.

### 2. Neon

- Create project `palnet`.
- Branch `main` = prod. Enable "branch per PR" integration with GitHub.
- Daily backups on by default — verify in the project settings.

### 3. Render (API)

- Create Web Service from GitHub repo, root `apps/api`, Dockerfile based build.
- Build command: `pnpm install --frozen-lockfile && pnpm --filter @palnet/db db:generate && pnpm --filter @palnet/api build`.
- Start command: `node dist/main.js`.
- Health check path: `/api/v1/health`.
- Autoscale off day one; one instance. Turn on later only if needed.
- Add a **pre-deploy job** that runs `pnpm --filter @palnet/db db:deploy` (Prisma migrate deploy).
- `REDIS_URL` is optional. When absent, Nest throttling uses in-memory storage. When set to a Render Redis/Key Value URL, throttling uses Redis-backed storage so limits survive restarts and multiple API instances.

### 4. Vercel (Web)

- Import repo. Root directory `apps/web`. Framework preset Next.js.
- Build command: `pnpm --filter @palnet/web... build` with `TURBO_TEAM`/`TURBO_TOKEN` env if using remote cache.
- Install command: `pnpm install --frozen-lockfile` at repo root.
- `NEXT_PUBLIC_*` vars set per environment.
- Custom domain `palnet.ps` + `www.palnet.ps` (redirect apex → www or vice versa — pick one).

### 5. EAS (Mobile)

- `npx eas-cli init` inside `apps/mobile`.
- `eas build --profile production --platform all` after signing credentials set up.
- `eas submit` when store listings are ready.
- OTA: `eas update --branch production` for JS-only hotfixes.

### 6. Cloudflare R2

- Create bucket `palnet-media-prod` (private) and `palnet-media-dev`.
- Public media served via custom domain `media.palnet.ps` mapped to R2 via a CNAME.
- Signed PUT URLs minted by the API only; uploads clamp to:
  - Images: 10 MB, `image/jpeg|png|webp`.
  - Video: 200 MB, `video/mp4`. No transcoding on day one.
  - Documents: 20 MB, `application/pdf`.

### 7. DNS

- `palnet.ps` → Vercel
- `api.palnet.ps` → Render
- `media.palnet.ps` → R2 public
- `status.palnet.ps` (optional) → Better Stack / UptimeRobot public page

## CI/CD

`.github/workflows/ci.yml` runs on every PR:

1. `pnpm install --frozen-lockfile`
2. `pnpm --filter @palnet/db db:generate`
3. `pnpm lint`
4. `pnpm type-check`
5. `pnpm test`
6. `pnpm --filter @palnet/web... build` (sanity, including workspace deps)
7. Seeded authed a11y gate: `pnpm --filter @palnet/web e2e:a11y-authed`.
8. Playwright against a spun-up local stack (Chromium).

Deploy is handled by Vercel + Render's own GitHub integrations — no manual deploy step. Main-branch merge triggers prod. PR triggers preview.

## Observability (baseline)

- Nest: `pino` logger with request id, user id, route, status.
- Render exposes logs + metrics out of the box. Pipe to Better Stack or Logtail if needed.
- Sentry (free tier) for both web, mobile, and api — same DSN project split by environment tag.
- UptimeRobot on `api.palnet.ps/api/v1/health` and `palnet.ps/`.
- Error budget and SLO dashboards deferred to post-PMF.

## Launch QA Checklist

Before promoting prod:

1. `QA_ENV_FILE=.env.qa.local corepack pnpm qa:web-authed` against disposable QA DB only
2. Confirm QA harness reports migrate/seed and 13/13 Chromium authed a11y checks passing
3. `corepack pnpm --filter @palnet/api test -- --runInBand`
4. `corepack pnpm --filter @palnet/api type-check`
5. `corepack pnpm --filter @palnet/web type-check`
6. `corepack pnpm --filter @palnet/mobile type-check`
7. `corepack pnpm --filter @palnet/shared type-check`
8. `corepack pnpm --filter @palnet/db type-check`
9. Re-run `corepack pnpm --filter @palnet/web e2e:a11y-authed` if web code changed after the QA harness
10. Maestro flows remain manual until a device runner or Maestro Cloud is chosen.

## Backups & Recovery

- Neon daily backups retained 7 days on free; bump tier if RPO needs tightening.
- R2 versioning enabled on prod bucket.
- Disaster recovery drill: once a quarter, restore latest Neon backup to a new branch and run migrations against it. Document runbook result.

## Cost Sanity (approximate, solo-builder tier, monthly)

- Vercel Hobby: $0 until limits → Pro $20/mo when prod launches publicly.
- Render Starter (API + SSE in one): $7/mo.
- Render Redis/Key Value: optional for persistent throttling; enable before horizontal API scaling.
- Neon Launch: $0 for dev, $19/mo once prod traffic starts.
- R2: pay-per-use, effectively $0 to start.
- EAS free tier: $0 for low-volume builds; Production plan $19/mo when shipping monthly builds.
- Sentry free, Better Stack free, UptimeRobot free.

Worst-case day-one burn ≈ $60/mo. When that cap feels tight, raise the plan of whichever service is actually constrained rather than re-architecting.
