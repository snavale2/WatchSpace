# ─────────────────────────────────────
# WatchSpace Server — Bun Dockerfile
# ─────────────────────────────────────

FROM oven/bun:1 AS base
WORKDIR /app

# ── Build Stage ─────────────
FROM base AS build

# Copy package configurations
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install ALL dependencies (including dev) to allow tsc to run
RUN bun install --no-save --ignore-scripts

# Copy source code required for building
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY tsconfig.json ./

# Build the shared package
RUN cd packages/shared && bun run build

# ── Production Stage ─────────────────
FROM oven/bun:1-slim AS production
WORKDIR /app

# Copy built code and configuration
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/package.json ./
COPY --from=build /app/tsconfig.json ./

# Install only production dependencies natively
RUN bun install --no-save --production --ignore-scripts

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["bun", "run", "apps/server/src/index.ts"]
