# Phase 2: Dev Infrastructure & AI Agent - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the Docker Compose dev stack (PostgreSQL 17 + Aspire Dashboard), validate server env vars with Zod, and equip Claude Code with full project context via a new `CLAUDE-DEV.md` and MCP config in `.claude/settings.json`.

New capabilities (Drizzle schema, OTEL instrumentation, security headers, tests) belong in subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### CLAUDE.md Strategy

- **D-01:** Do NOT modify the existing `CLAUDE.md` — it is GSD-managed and contains the full tech stack reference and project overview.
- **D-02:** Create a new `CLAUDE-DEV.md` at the project root as the developer quick-reference file. Claude Code reads all `CLAUDE*.md` files automatically. This keeps GSD-managed content separate from manually maintained developer reference content.
- **D-03:** `CLAUDE-DEV.md` must contain these four sections:
  1. **Key Commands** — `pnpm run dev`, `docker compose up`, build, test, and db scripts (some marked TBD until later phases)
  2. **Folder Structure** — planned layout of `src/routes/`, `src/lib/server/`, `src/lib/assets/`, `drizzle/`, `docker/` with purpose of each
  3. **Coding Conventions** — Svelte 5 runes (not stores), `$env/dynamic/private` for secrets, server-only imports in `$lib/server/`, and key patterns from Phase 1
  4. **Testing Patterns** — overview of test types and where they live; mark specifics TBD until Phase 7
- **D-04:** Do NOT list all dependencies with versions in `CLAUDE-DEV.md`. Only mention the major stack items by name and refer to `package.json` for full details.

### MCP Configuration

- **D-05:** Add `mcpServers` key to the existing `.claude/settings.json` alongside the current GSD hooks. No separate file needed.
- **D-06:** The `@sveltejs/mcp` server entry:
  ```json
  "mcpServers": {
    "svelte": {
      "command": "npx",
      "args": ["@sveltejs/mcp"]
    }
  }
  ```

### Docker Compose

- **D-07:** `docker-compose.yml` defines two services:
  1. **PostgreSQL 17** — named volume for persistence, health check using `pg_isready`
  2. **.NET Aspire Dashboard** — standard ports: `18888:18888` (UI), `4317:18889` (OTLP gRPC), `4318:18890` (OTLP HTTP)
- **D-08:** All credentials reference `.env` via variable substitution — no hardcoded secrets in the compose file.

### Environment Variables

- **D-09:** `.env.example` documents all Phase 2 required vars with inline comments and working dev defaults. Developer copies to `.env` and gets a working local stack immediately.
- **D-10:** Default PostgreSQL dev credentials: `postgres/postgres`, database name `app`, port `5432`.
  - Connection string: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/app`
- **D-11:** Zod schema validates **only the vars used in Phase 2**: `DATABASE_URL`. Future phases (Observability, etc.) add their own vars to the schema when those services are integrated. Keeps validation honest — the app fails fast on vars it actually uses.
- **D-12:** Zod schema lives in `src/lib/server/env.ts`. Uses `$env/dynamic/private` (not `$env/static/private`) — required for Docker environment-per-deployment pattern.

### Claude's Discretion

- Exact wording and formatting of `CLAUDE-DEV.md` sections — follow the conventions from Phase 1 context
- Specific Zod validation messages (keep them descriptive and actionable)
- Whether to use a single `DATABASE_URL` connection string or individual `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` vars — either works, but a single URL is simpler for most ORMs

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements

- `.planning/REQUIREMENTS.md` §Dev Infrastructure & AI Agent — DOCK-01, ENV-01, ENV-02, ENV-03, AI-01, AI-02 define exact acceptance criteria for this phase

### Technology

- `CLAUDE.md` §Technology Stack — full version table for all dependencies
- `CLAUDE.md` §What NOT to Use — forbidden patterns (especially `$env/static/private` for secrets)

### Existing Files to Preserve

- `.claude/settings.json` — contains GSD hooks; MCP config is ADDED to this file, not replacing it
- `CLAUDE.md` — GSD-managed; do not edit

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `.claude/settings.json` — exists with GSD hooks; extend with `mcpServers` block
- `CLAUDE.md` — exists, GSD-managed; leave untouched

### Established Patterns (from Phase 1)

- pnpm is the package manager
- Svelte 5 runes (`$state`, `$effect`, `$props`) — not writable() stores
- `{@render children()}` — not `<slot />`
- CSS-first Tailwind pattern: all config in `src/app.css`, no `tailwind.config.js`
- All dependencies as runtime deps unless dev-only (e.g., daisyui is a runtime dep)

### Integration Points

- Phase 3 (Code Quality) will add ESLint/Prettier/Husky — Phase 2 doesn't need to configure those
- Phase 4 (Database) will add Drizzle schema — Phase 2 only stands up PostgreSQL, no ORM yet
- Phase 5 (Observability) will add OTEL vars to the Zod schema and configure `instrumentation.server.ts`
- Phase 8 (Production Docker) will finalize `CLAUDE-DEV.md` with all commands filled in

</code_context>

<specifics>
## Specific Ideas

- `CLAUDE-DEV.md` should feel like a one-page cheat sheet — something an AI agent (or new developer) reads first and immediately knows how to work in this repo
- Commands marked TBD should include a comment indicating which phase will fill them in (e.g., `db:migrate` — available after Phase 4)
  </specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 02-dev-infrastructure-ai-agent_
_Context gathered: 2026-04-06_
