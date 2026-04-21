# SvelteKit Starter

A full-stack SvelteKit starter with PostgreSQL, Drizzle ORM, Tailwind CSS, and OpenTelemetry observability. Deployable as a Node.js Docker container.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/) `>= 10`
- [Docker](https://docs.docker.com/get-docker/) (for local Postgres and the Aspire observability dashboard)

> **Dev container** — a `.devcontainer` configuration is included. Opening the project in VS Code (or any Dev Containers-compatible tool) will provision a container with Node.js, pnpm, and Docker already set up, so no local installation is needed.

## Getting started

```bash
# 1. Start Postgres and the Aspire dashboard
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Run database migrations
pnpm db:migrate

# 4. Start the dev server
pnpm dev
```

The app will be available at `http://localhost:5173`.  
The Aspire observability dashboard is at `http://localhost:18888`.

Environment variables for local development are in `.env.development` (committed, no real secrets).

## Commands

| Command            | Description                                    |
| ------------------ | ---------------------------------------------- |
| `pnpm dev`         | Start the dev server                           |
| `pnpm build`       | Build for production                           |
| `pnpm preview`     | Preview the production build locally           |
| `pnpm check`       | Type-check with `svelte-check`                 |
| `pnpm lint`        | Lint with ESLint                               |
| `pnpm format`      | Format with Prettier                           |
| `pnpm test:unit`   | Run unit tests (Vitest)                        |
| `pnpm test:e2e`    | Run end-to-end tests (Playwright)              |
| `pnpm test`        | Run all tests                                  |
| `pnpm db:generate` | Generate a migration from schema changes       |
| `pnpm db:migrate`  | Apply pending migrations                       |
| `pnpm db:push`     | Push schema directly to DB (no migration file) |
| `pnpm db:studio`   | Open Drizzle Studio to browse the database     |

## Deploy with Docker

```bash
# 1. Create a production env file and fill in real credentials
cp .env.example .env

# 2. Build and start
docker compose -f docker/docker-compose.prod.yml up -d --build
```

The app runs on port `3000` (override with the `PORT` env var). Health check endpoint: `GET /api/health`.

## Key libraries

| Library                                                                       | Purpose                                 |
| ----------------------------------------------------------------------------- | --------------------------------------- |
| [SvelteKit](https://kit.svelte.dev)                                           | Full-stack web framework                |
| [Drizzle ORM](https://orm.drizzle.team)                                       | Type-safe SQL ORM for PostgreSQL        |
| [Tailwind CSS](https://tailwindcss.com)                                       | Utility-first CSS framework             |
| [DaisyUI](https://daisyui.com)                                                | Component library for Tailwind          |
| [Zod](https://zod.dev)                                                        | Schema validation                       |
| [OpenTelemetry](https://opentelemetry.io)                                     | Distributed tracing and structured logs |
| [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) | Unit testing                            |
| [Playwright](https://playwright.dev)                                          | End-to-end testing                      |
| [Husky](https://typicode.github.io/husky) + lint-staged                       | Pre-commit hooks (lint + format)        |
| [nosecone](https://arcjet.com/nosecone)                                       | Security headers and CSP                |
