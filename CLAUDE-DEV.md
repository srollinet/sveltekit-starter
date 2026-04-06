# Developer Quick Reference

> One-page cheat sheet for working in this repo. For the full tech stack reference, see `CLAUDE.md`.

## Key Commands

| Command                  | Description                                                                |
| ------------------------ | -------------------------------------------------------------------------- |
| `pnpm run dev`           | Start SvelteKit dev server (http://localhost:5173)                         |
| `pnpm run build`         | Production build via adapter-node (outputs to `build/`)                    |
| `pnpm run preview`       | Preview the production build locally                                       |
| `docker compose up`      | Start PostgreSQL + Aspire Dashboard dev stack                              |
| `docker compose down`    | Stop dev stack (data persists in named volume)                             |
| `docker compose down -v` | Stop dev stack AND reset database (removes volumes)                        |
| `pnpm run lint`          | Run ESLint _(available after Phase 3)_                                     |
| `pnpm run format`        | Run Prettier _(available after Phase 3)_                                   |
| `pnpm run check`         | Run svelte-check for type errors                                           |
| `pnpm test:unit`         | Run Vitest unit tests                                                      |
| `pnpm test:e2e`          | Run Playwright E2E tests _(available after Phase 7)_                       |
| `pnpm test`              | Run all tests (unit + E2E)                                                 |
| `pnpm run db:generate`   | Generate Drizzle migration from schema changes _(available after Phase 4)_ |
| `pnpm run db:migrate`    | Apply pending Drizzle migrations _(available after Phase 4)_               |
| `pnpm run db:push`       | Push schema directly to dev DB (no migration) _(available after Phase 4)_  |
| `pnpm run db:studio`     | Open Drizzle Studio GUI _(available after Phase 4)_                        |

## Folder Structure

```
src/
  routes/                    # SvelteKit file-based routing
    +layout.svelte           # Root layout (navbar + drawer + theme toggle)
    +page.svelte             # Home page
    +error.svelte            # Error page (DaisyUI styled)
    api/                     # API routes (added in later phases)
  lib/
    server/                  # Server-only modules ($lib/server/*)
      env.ts                 # Zod-validated environment variables
      db/                    # Database client + schema (added in Phase 4)
    assets/                  # Static assets imported by components
    components/              # Shared Svelte components
  app.css                    # Tailwind v4 + DaisyUI CSS-first config
  app.html                   # HTML shell with data-theme attribute
  hooks.server.ts            # Server hooks (env validation, security, OTEL)
drizzle/                     # Generated migrations (added in Phase 4)
docker-compose.yml           # Dev stack: PostgreSQL + Aspire Dashboard
.env.example                 # Environment variable template (copy to .env)
vite.config.ts               # Vite config with Tailwind + SvelteKit + Vitest
```

## Coding Conventions

- **Svelte 5 runes** — use `$state`, `$derived`, `$effect`, `$props` (not `writable()` stores)
- **Render children** — use `{@render children()}` (not `<slot />`)
- **Dynamic env** — use `$env/dynamic/private` for secrets (not `$env/static/private`); required for Docker runtime env
- **Server-only** — put secrets, DB access, and sensitive logic in `$lib/server/`; SvelteKit enforces this at build time
- **CSS-first Tailwind** — all Tailwind + DaisyUI config in `src/app.css` via `@import` and `@plugin`; no `tailwind.config.js`
- **Package manager** — pnpm (not npm or yarn)
- **Types** — TypeScript strict mode; prefer explicit types over `any`

## Testing Patterns

- **Unit tests**: `src/**/*.test.ts` — run with `pnpm test:unit` (Vitest)
- **Component tests**: `src/**/*.svelte.test.ts` — use `@testing-library/svelte` _(patterns established in Phase 7)_
- **E2E tests**: `tests/` directory — run with `pnpm test:e2e` (Playwright) _(patterns established in Phase 7)_
- **Test environment**: Unit/server tests use `environment: 'node'`; component tests will use `jsdom`
- **Mocking SvelteKit modules**: Use `vi.mock('$env/dynamic/private', ...)` for env vars in tests
