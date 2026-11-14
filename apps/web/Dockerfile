# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui-tokens/package.json packages/ui-tokens/package.json
COPY packages/ui-web/package.json packages/ui-web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @baydar/shared build && pnpm --filter @baydar/web build

FROM node:20-alpine AS runtime
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web/package.json ./apps/web/package.json
COPY --from=build /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/web/.next ./apps/web/.next
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["pnpm", "--filter", "@baydar/web", "start"]
