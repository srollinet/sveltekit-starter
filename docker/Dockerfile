# ── Stage 1: deps ──────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# corepack is included with Node.js 22; enables pnpm without network call
RUN corepack enable pnpm

# Copy lockfile and manifests first for maximum layer cache
# pnpm-workspace.yaml is required (blockExoticSubdeps: true)
# .npmrc is required (engine-strict=true)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Install ALL deps (devDeps needed for vite build)
RUN pnpm install --frozen-lockfile

# ── Stage 2: builder ──────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable pnpm

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files (filtered by .dockerignore)
COPY . .

# Build the SvelteKit app — adapter-node outputs to build/
RUN pnpm run build

# ── Stage 3: runtime ──────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

RUN corepack enable pnpm

# Install curl for HEALTHCHECK (not present in node:22-alpine by default)
RUN apk add --no-cache curl

# Copy package manifests for pnpm prune
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./

# Copy full node_modules, then prune to production-only
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm prune --prod

# Copy built app (adapter-node output)
COPY --from=builder /app/build ./build

# Set ownership to non-root node user (uid 1000, already exists in node:22-alpine)
RUN chown -R node:node /app

# Run as non-root user per D-07
USER node

# Set production environment per D-11
ENV NODE_ENV=production
# Default port per D-09 (adapter-node default)
ENV PORT=3000

EXPOSE 3000

# Health check per D-08 — probes the existing /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# adapter-node entry point — build/index.js imports instrumentation.server.js first
CMD ["node", "build/index.js"]
