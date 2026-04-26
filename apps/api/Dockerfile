# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# deps
FROM base AS deps
COPY . .
RUN pnpm install --frozen-lockfile

# build
FROM deps AS build
RUN pnpm --filter @palnet/db db:generate \
 && pnpm --filter @palnet/shared build \
 && pnpm --filter @palnet/api build \
 && pnpm deploy --filter @palnet/api --prod /pruned

# runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache curl tini
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /pruned ./
COPY --from=build /repo/packages/db/prisma ./packages/db/prisma
USER node
EXPOSE 10000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
