A full-stack SvelteKit starter with PostgreSQL, Drizzle ORM, Tailwind CSS, and OpenTelemetry observability. Deployable as a Node.js Docker container.

## Setup

This project uses **pnpm** (not npm or yarn).

```bash
docker compose up -d   # start Postgres + Aspire dashboard
pnpm install
pnpm db:migrate
pnpm dev
```

## Key commands

| Command            | Description                                 |
| ------------------ | ------------------------------------------- |
| `pnpm check`       | Type-check (svelte-check + svelte-kit sync) |
| `pnpm lint`        | Lint with ESLint                            |
| `pnpm test`        | Run all tests                               |
| `pnpm db:generate` | Generate migration from schema changes      |
| `pnpm db:migrate`  | Apply pending migrations                    |

## Project structure

```
src/
  routes/          # SvelteKit pages and API routes (+page.svelte, +page.server.ts, +server.ts)
  lib/
    components/    # Shared Svelte components
    server/        # Server-only code (never imported by client)
      db/
        index.ts            # Drizzle client
        schema/             # One file per table; re-export all from schema/index.ts
      env/         # Validated server environment variables
    index.ts       # Public lib exports (client-safe)
drizzle/           # Generated migration SQL files — always commit these
```

## Mandatory libraries

Always use the following libraries for their respective concerns. Never substitute alternatives.

| Concern    | Library    |
| ---------- | ---------- |
| UI         | DaisyUI    |
| Validation | Zod        |
| Database   | Drizzle    |
| Forms      | Superforms |

Always read the relevant documentation file before implementing anything in that domain.

## Documentation

- [docs/CONVENTIONS.md](docs/CONVENTIONS.md) — Coding conventions (TypeScript, Zod, DTOs, DaisyUI)
- [docs/SVELTE.md](docs/SVELTE.md) — Svelte 5 patterns and MCP server usage
- [docs/DATABASE.md](docs/DATABASE.md) — Drizzle ORM schema conventions and query patterns
- [docs/SUPERFORMS.md](docs/SUPERFORMS.md) — SvelteKit Superforms: server validation, client form state, file uploads, nested data, SPA mode
- [docs/TESTING.md](docs/TESTING.md) — Testing patterns and commands
