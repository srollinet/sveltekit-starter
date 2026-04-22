# ── Stage 1: deps ──────────────────────────────────────────────
FROM node:24-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS deps
WORKDIR /app

# corepack is included with Node.js 24; enables pnpm without network call
RUN corepack enable pnpm

# Copy lockfile and manifests first for maximum layer cache
# pnpm-workspace.yaml is required (blockExoticSubdeps: true)
# .npmrc is required (engine-strict=true)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Install ALL deps (devDeps needed for vite build)
RUN pnpm install --frozen-lockfile

# ── Stage 2: builder ──────────────────────────────────────────
FROM node:24-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS builder
WORKDIR /app

RUN corepack enable pnpm

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files (filtered by .dockerignore)
COPY . .

# Provide a dummy DATABASE_URL so Zod env validation passes at build time.
# The actual value is injected at runtime via env_file — this placeholder
# is only present during the vite build step and does NOT end up in the image.
# SECURITY: Never pass a real DATABASE_URL via --build-arg; ARG values are
# permanently visible in `docker history` regardless of whether they are used.
ARG DATABASE_URL=postgres://placeholder:placeholder@localhost:5432/placeholder

# Build the SvelteKit app — adapter-node outputs to build/
RUN DATABASE_URL=${DATABASE_URL} pnpm run build

# Prune devDependencies from node_modules in-place, then clear the pnpm store.
# --ignore-scripts prevents lifecycle scripts (e.g. prepare: husky)
RUN pnpm prune --prod --ignore-scripts && \
    pnpm store prune

# ── Stage 3: runtime ──────────────────────────────────────────
FROM node:24-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS runtime
WORKDIR /app

# Fix /app ownership. No package manager is present or needed in this stage.
RUN chown node:node /app

USER node

# Copy only the runtime artifacts — no package manager, no source, no test files.
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/build ./build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check probes the existing /api/health endpoint.
# Uses the Node.js binary already present — curl is not needed and would
# add an unnecessary network-capable binary to the attack surface.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "import('http').then(h=>h.default.get('http://localhost:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1)))"

# adapter-node entry point — build/index.js imports instrumentation.server.js first
CMD ["node", "build/index.js"]
