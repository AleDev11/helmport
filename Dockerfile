# syntax=docker/dockerfile:1

# ---- Base -------------------------------------------------------------------
FROM oven/bun:1-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ---- Dependencies (all, for building) --------------------------------------
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Build ------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---- Production dependencies only ------------------------------------------
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---- Runtime ----------------------------------------------------------------
FROM base AS runtime
ENV HOST=0.0.0.0 \
    PORT=4321

# Only ship prod deps + the compiled server/client.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Run as the unprivileged built-in user.
USER bun

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4321/api/health >/dev/null 2>&1 || exit 1

CMD ["bun", "./dist/server/entry.mjs"]
