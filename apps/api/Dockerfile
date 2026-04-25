# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ─── deps ────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/ui-tokens/package.json packages/ui-tokens/package.json
RUN pnpm install --frozen-lockfile

# ─── build ───────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter @palnet/db db:generate \
 && pnpm --filter @palnet/shared build \
 && pnpm --filter @palnet/api build

# ─── runtime ─────────────────────────────────────────
FROM node:20-alpine AS runtime
RUN apk add --no-cache curl \
 && corepack enable \
 && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/packages ./packages
EXPOSE 10000
CMD ["node", "apps/api/dist/main.js"]
