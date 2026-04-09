---
phase: 02-dev-infrastructure-ai-agent
plan: 04
type: execute
wave: 1
depends_on: []
files_modified: [docker-compose.yml]
autonomous: true
gap_closure: true
requirements: [DOCK-01]

must_haves:
  truths:
    - 'docker compose up starts PostgreSQL with no blank-string warnings for POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD'
    - 'pg healthcheck passes (pg_isready succeeds with correct user and database)'
  artifacts:
    - path: 'docker-compose.yml'
      provides: 'PostgreSQL service with env_file-only variable injection and runtime healthcheck expansion'
  key_links:
    - from: '.env.development'
      to: 'postgres container'
      via: 'env_file directive (container-level injection, not compose-time interpolation)'
---

<objective>
Fix docker-compose.yml so PostgreSQL env vars are injected solely via env_file (no redundant environment block) and the healthcheck expands vars at container runtime (double-dollar syntax).

Purpose: Close UAT gaps 1 and 4 -- eliminate blank-string warnings and the "FATAL: role -d does not exist" healthcheck failure.
Output: A corrected docker-compose.yml that passes `docker compose up -d` cleanly.
</objective>

<execution_context>
@/workspaces/sveltekit-starter/.claude/get-shit-done/workflows/execute-plan.md
@/workspaces/sveltekit-starter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docker-compose.yml
@.env.development

Root cause: docker-compose.yml uses `env_file: .env.development` AND an `environment:` block with `${POSTGRES_USER}` interpolation. Docker Compose resolves `${VAR}` from the host shell or a top-level `.env` file -- NOT from the service's `env_file`. This causes blank-string substitution and a broken healthcheck.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove redundant environment block and fix healthcheck variable expansion</name>
  <files>docker-compose.yml</files>
  <action>
Make exactly two changes to docker-compose.yml:

1. DELETE the entire `environment:` block (lines 5-8) from the `postgres` service. The `env_file: .env.development` directive already injects POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB into the container environment. The `environment:` block with `${VAR}` syntax causes Docker Compose to interpolate at parse time from the host shell, which fails.

2. In the healthcheck `test` command, change:
   - `${POSTGRES_USER}` to `$$POSTGRES_USER`
   - `${POSTGRES_DB}` to `$$POSTGRES_DB`
     The double-dollar `$$` escapes Compose-time interpolation and becomes a literal `$` inside the container shell, where the env vars (loaded via env_file) are available at runtime.

The resulting postgres service should look like:

```yaml
postgres:
  image: postgres:17-alpine
  env_file: .env.development
  ports:
    - '5432:5432'
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB']
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
```

Do NOT change the aspire-dashboard service or the volumes section.
</action>
<verify>
<automated>docker compose config 2>&1 | grep -c "WARN" | grep -q "^0$" && echo "PASS: no warnings" || echo "FAIL: warnings found"</automated>
Also run: `docker compose down && docker compose up -d` then `docker compose ps` -- postgres should show "healthy" status within 30 seconds.
</verify>
<done> - `docker compose config` produces no WARN lines about unset variables - `docker compose up -d` starts postgres without blank-string warnings - `docker compose ps` shows postgres healthcheck as "healthy" (not "unhealthy") - Aspire dashboard remains unaffected and reachable at localhost:18888
</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

No new trust boundaries introduced. This is a config-only fix to an existing dev-only service.

## STRIDE Threat Register

| Threat ID  | Category                   | Component        | Disposition | Mitigation Plan                                                                                                                             |
| ---------- | -------------------------- | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| T-02-04-01 | I (Information Disclosure) | .env.development | accept      | Dev-only file with local defaults; .gitignore already covers .env files; .env.development is committed intentionally with safe dev defaults |

</threat_model>

<verification>
1. `docker compose config 2>&1` contains zero WARN lines
2. `docker compose up -d` starts both services
3. `docker compose ps` shows postgres as healthy within 30s
4. `psql -h localhost -U starter_user -d starter_db -c "SELECT 1"` succeeds (using values from .env.development)
</verification>

<success_criteria>
UAT tests 1 (Cold Start Smoke Test) and 4 (Docker Compose Starts Services) pass with no warnings or healthcheck failures.
</success_criteria>

<output>
After completion, create `.planning/phases/02-dev-infrastructure-ai-agent/02-04-SUMMARY.md`
</output>
