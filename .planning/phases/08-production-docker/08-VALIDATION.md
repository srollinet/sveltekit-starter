---
phase: 8
slug: production-docker
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Framework**          | docker CLI + shell assertions                                                                                |
| **Config file**        | docker/Dockerfile, docker-compose.yml                                                                        |
| **Quick run command**  | `docker build -f docker/Dockerfile . --quiet`                                                                |
| **Full suite command** | `docker build -f docker/Dockerfile . && docker run --rm --env-file .env <image> node -e "console.log('ok')"` |
| **Estimated runtime**  | ~60 seconds                                                                                                  |

---

## Sampling Rate

- **After every task commit:** Run `docker build -f docker/Dockerfile . --quiet`
- **After every plan wave:** Run full suite (build + smoke run)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior                    | Test Type | Automated Command                                                                                               | File Exists | Status     |
| ------- | ---- | ---- | ----------- | ---------- | ---------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- | ----------- | ---------- |
| 8-01-01 | 01   | 1    | DOCK-02     | —          | Non-root user in image             | shell     | `docker build -f docker/Dockerfile . && docker run --rm <image> whoami \| grep -v root`                         | ✅          | ⬜ pending |
| 8-01-02 | 01   | 1    | DOCK-02     | —          | Image under 200MB                  | shell     | `docker image inspect <image> --format='{{.Size}}' \| awk '{print ($1 < 209715200)}'`                           | ✅          | ⬜ pending |
| 8-02-01 | 02   | 2    | DOCK-03     | —          | No hardcoded secrets in compose    | shell     | `grep -v '^\s*#' docker-compose.yml \| grep -v '\${' \| grep -iE 'password\|secret\|key' && exit 1 \|\| exit 0` | ✅          | ⬜ pending |
| 8-03-01 | 03   | 3    | DOCK-04     | —          | CLAUDE.md updated with conventions | shell     | `grep -c 'Convention\|convention' CLAUDE.md \| awk '{exit ($1 > 0) ? 0 : 1}'`                                   | ✅          | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

_Existing infrastructure covers all phase requirements. No test framework installation needed — validation is via docker CLI and shell assertions._

---

## Manual-Only Verifications

| Behavior                                    | Requirement | Why Manual                                  | Test Instructions                                                          |
| ------------------------------------------- | ----------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| App serves requests in production container | DOCK-02     | Requires running compose stack with live DB | Run `docker compose up`, curl `http://localhost:3000`, verify 200 response |
| Database connection from container works    | DOCK-02     | Requires live postgres service              | Check compose logs for `Server started` without DB connection errors       |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
