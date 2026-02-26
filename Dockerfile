# ─────────────────────────────────────
# WatchSpace Server — Bun Dockerfile
# ─────────────────────────────────────

FROM oven/bun:1 AS base
WORKDIR /app

# ── Install dependencies ─────────────
FROM base AS deps
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
RUN bun install --no-save --production --ignore-scripts

# ── Build shared package ─────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY package.json tsconfig.json ./
RUN cd packages/shared && bun run build

# ── Production image ─────────────────
FROM oven/bun:1-slim AS production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/package.json ./
COPY --from=build /app/tsconfig.json ./

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["bun", "run", "apps/server/src/index.ts"]
