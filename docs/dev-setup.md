# Dev Setup

One-time local setup. Takes ~10 minutes.

## Prerequisites
- Node 20+ (Volta or nvm)
- pnpm 9+ (`npm install -g pnpm@9.12.0`)
- PostgreSQL 16+ locally, **or** a Neon project

## 1. Clone + install
```bash
git clone <repo> C:\LinkedIn
cd C:\LinkedIn
pnpm install
```

## 2. Environment
```bash
cp .env.example .env.local
```
Edit `.env.local` and fill in:
- `DATABASE_URL` / `DIRECT_URL` — Postgres connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — each 32+ random chars
  (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`)

## 3. Database
### Option A — local Postgres
```bash
# Windows (scoop)
scoop install postgresql

# Start service, then create DB:
psql -U postgres -c "CREATE DATABASE baydar;"
```

### Option B — Neon (free)
1. https://neon.tech → create project `baydar-dev`
2. Paste the pooled connection string into `DATABASE_URL` and the direct one into `DIRECT_URL`

## 4. First migration + seed
```bash
pnpm --filter @baydar/db db:generate
pnpm --filter @baydar/db db:migrate --name init
pnpm --filter @baydar/db db:seed
```

Expected seed output:
```
[seed] ready — demo user demo@baydar.ps (password: Password123)
```

## 5. Build shared packages
```bash
pnpm --filter @baydar/shared build
pnpm --filter @baydar/db build
```

## 6. Run the stack
In three terminals:

```bash
# API — http://localhost:4000 (Swagger at /api/docs)
pnpm --filter @baydar/api dev

# Web — http://localhost:3000 (redirects to /ar-PS)
pnpm --filter @baydar/web dev

# Mobile — Expo Dev Tools
pnpm --filter @baydar/mobile start
```

## 7. Sanity check
```bash
curl http://localhost:4000/api/v1/health
# { "data": { "status": "ok", "uptimeMs": ..., "version": "..." } }
```

Sign in on web with:
- email: `demo@baydar.ps`
- password: `Password123`

## Troubleshooting

**`Cannot find module '@baydar/db'` in API:**
The shared TS packages emit to `dist/`. Rebuild them:
```bash
pnpm --filter @baydar/shared build && pnpm --filter @baydar/db build
```

**Prisma Client not regenerated after schema change:**
```bash
pnpm --filter @baydar/db db:generate
```

**Migration conflicts:**
Only `prisma migrate dev` in local. Never run it against prod.
Prod uses `prisma migrate deploy`.
