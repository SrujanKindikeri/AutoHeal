# MovieFlow AutoHeal Engine (Phases 6 & 8)

The **AutoHeal Engine** is a high-reliability, asynchronous Python service built on **FastAPI** that receives alerts from Prometheus Alertmanager, classifies infrastructure and application incidents, generates rule-based healing recommendations, and coordinates controlled container remediation through **Ansible** automation.

---

## 1. End-to-End Architecture

```
Prometheus (:9090) ──> Alertmanager (:9093)
                             │
                             │ HTTP POST /webhook/alerts
                             ▼
FastAPI AutoHeal Engine (:5001)
     ├── Webhook Parser (Pydantic Schema Validation)
     ├── Incident Classifier (Service & Category Mapping)
     ├── Decision Engine (Rule-based recovery recommendations)
     ├── Recovery Safety Gates (Allowlist, Cooldown, Circuit Breaker, Confidence)
     ├── Execution Modes: DRY_RUN (Default) | APPROVAL_REQUIRED | AUTO_RECOVERY
     └── Ansible Subprocess Runner
              │
              │ docker run ... movieflow-ansible-runner:latest python scripts/run_recovery.py <action>
              ▼
Ansible Runner (movieflow-ansible-runner)
     ├── Safe Action-to-Playbook Mapping
     ├── Container Status Inspection
     ├── Playbook Check/Dry-Run Mode (DRY_RUN default)
     └── Post-Recovery Health Verification (HTTP 200 / TCP probe)
```

---

## 2. API Endpoints

### Core Incident APIs
- `GET /health` — Health check endpoint verifying engine state and SQLite connectivity.
- `GET /status` — Operational statistics (mode, total incidents, firing/resolved breakdown, uptime).
- `POST /webhook/alerts` — Alertmanager webhook receiver (triggers decision and remediation pipeline).
- `GET /incidents` — List recorded incidents with optional `status`, `service`, and `limit` query parameters.
- `GET /incidents/{incident_id}` — Detailed incident report with full recovery execution trace.

### Recovery Automation APIs (Phase 8)
- `GET /recovery/status` — Operational status of recovery executor, circuit breakers, and active cooldowns.
- `GET /recovery/history` — Audit log of all recovery execution runs.
- `GET /recovery/cooldowns` — Active cooldown status and remaining countdowns for each service.
- `GET /recovery/pending` — List of incidents currently awaiting operator approval (`APPROVAL_REQUIRED` mode).
- `POST /recovery/approve/{incident_id}` — Securely approve a pending recovery action (requires `X-AutoHeal-Key`).
- `POST /recovery/reject/{incident_id}` — Securely reject a pending recovery action (requires `X-AutoHeal-Key`).
- `GET /metrics` — Prometheus metrics exposition endpoint for AutoHeal metrics.

---

## 3. Incident Classifications & Action Mapping

| Alert Name | Service | Category | Recommended Action | Playbook Target | Confidence |
|---|---|---|---|---|---|
| `BackendUnavailable` | `backend` | `availability` | `restart_backend` | `playbooks/recover_backend.yml` | 0.95 |
| `FrontendUnavailable` | `frontend` | `availability` | `restart_frontend` | `playbooks/recover_frontend.yml` | 0.95 |
| `RedisDown` / `RedisUnavailable` | `redis` | `availability` | `restart_redis` | `playbooks/recover_redis.yml` | 0.95 |
| `MonitoringStackDown` | `monitoring` | `availability` | `investigate_monitoring` | *(None - manual)* | 0.90 |
| `MonitoringTargetDown` | `infrastructure` | `target_health` | `investigate_monitoring` | *(None - manual)* | 0.85 |
| `HighHostCPUUsage` | `host` | `resource` | `investigate_resource_usage`| *(None - manual)* | 0.85 |
| `LowHostMemory` | `host` | `resource` | `investigate_resource_usage`| *(None - manual)* | 0.85 |
| `ContainerHighMemoryUsage` | `container` | `resource` | `investigate_resource_usage`| *(None - manual)* | 0.85 |
| *(Resolved alerts)* | * | * | `no_action` | *(None)* | 1.00 |
| *(Unknown alerts)* | `unknown` | `manual_investigation`| `manual_investigation` | *(None)* | 0.50 |

---

## 4. Execution Modes & Safety Guardrails

1. **Mode A: DRY_RUN (Default & Enforced in Phase 8):**
   Ansible executes in check/dry-run mode (`--check`). Target containers are inspected and simulated without restarts.
2. **Mode B: APPROVAL_REQUIRED:**
   Incidents are held in `pending` approval status. Requires authorized token approval via `POST /recovery/approve/{incident_id}` before execution.
3. **Mode C: AUTO_RECOVERY (Disabled by default):**
   Requires `ENABLE_AUTO_RECOVERY=True` and confirmation. (Remains strictly disabled during Phase 8).
4. **PostgreSQL Protection:**
   Automated remediation targeting `postgres` is hard-blocked at both the API and task level.
5. **Circuit Breaker:**
   Halts repeated recovery attempts after 3 consecutive failures to prevent restart loops.
6. **Persistent Cooldown:**
   Enforces a 300s quiet window per service stored in SQLite across container restarts.

---

## 5. Running Tests

Inside the container:
```bash
docker compose exec autoheal pytest -v
# 43 passed in 1.73s
```
