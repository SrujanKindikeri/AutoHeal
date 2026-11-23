# MovieFlow AutoHeal — Python & Ansible Integration Guide (Phase 8)

This document provides a comprehensive architectural and operational specification for the **Full Python + Ansible Self-Healing Integration** developed in **Phase 8** of the **INT333 MovieFlow AutoHeal** project.

---

## 1. End-to-End System Architecture

The MovieFlow AutoHeal platform unites continuous metric collection, threshold alerting, asynchronous incident classification, rule-based decision intelligence, and containerized Ansible remediation into a unified self-healing ecosystem.

```
+---------------------------------------------------------------------------------------------------+
|                                 Continuous Metric Observation                                     |
|    - Prometheus (:9090) scrapes Blackbox Exporter (:9115), cAdvisor (:8080), Node Exporter (:9100) |
+-------------------------------------------------+-------------------------------------------------+
                                                  │ Failure Condition Exceeds Threshold
                                                  │ (e.g. BackendUnavailable > 30s)
                                                  ▼
+---------------------------------------------------------------------------------------------------+
|                                      Prometheus Alertmanager                                      |
|    - Routes alerts matching rules to http://autoheal:5001/webhook/alerts                          |
+-------------------------------------------------+-------------------------------------------------+
                                                  │ HTTP POST Webhook
                                                  ▼
+---------------------------------------------------------------------------------------------------+
|                                     FastAPI AutoHeal Engine                                       |
|    1. Webhook Validation & Ingestion (Pydantic schema validation)                                 |
|    2. Incident Classification (IncidentClassifier -> service domain & severity)                  |
|    3. Decision Engine (Rule-based recommendation with confidence >= 0.90)                         |
|    4. Safety & Policy Gatekeeper:                                                                |
|       - Action Allowlist: {"restart_backend", "restart_frontend", "restart_redis"}                |
|       - Forbidden Targets Check: postgres, prometheus, alertmanager strictly blocked              |
|       - Alert State Check: firing alerts only; resolved alerts produce no action                  |
|       - Persistent Cooldown Check: 300s window per service in SQLite                              |
|       - Circuit Breaker Check: Trip to OPEN on 3 consecutive failures                             |
|       - Loop Protection Check: Max 3 attempts per incident                                        |
|    5. Execution Mode Enforcement:                                                                 |
|       - Mode A: DRY_RUN (Default) -> Invokes Ansible in check mode (--check)                      |
|       - Mode B: APPROVAL_REQUIRED -> PENDING_APPROVAL status awaiting secure operator token       |
|       - Mode C: AUTO_RECOVERY -> Multi-layer confirmation required (Disabled in Phase 8)         |
|    6. Persistent Storage (SQLite WAL mode: incidents, recovery_history, cooldowns, breakers)     |
|    7. Prometheus Metrics Exposition (Exposes execution counters & gauges at /metrics)             |
+-------------------------------------------------+-------------------------------------------------+
                                                  │
                                                  │ Subprocess Execution:
                                                  │ docker run --rm --network multiflow_movieflow_net \
                                                  │   -v /var/run/docker.sock:/var/run/docker.sock \
                                                  │   movieflow-ansible-runner:latest \
                                                  │   python scripts/run_recovery.py <action> ...
                                                  ▼
+---------------------------------------------------------------------------------------------------+
|                                Ansible Runner Execution Container                                 |
|                               (movieflow-ansible-runner:latest)                                   |
|    - Maps action identifier to deterministic playbook (recover_backend.yml, etc.)                 |
|    - Verifies container presence via community.docker.docker_container_info                       |
|    - In DRY_RUN mode: Simulates recovery, reports pre-remediation state, skips restart            |
|    - In EXECUTE mode: Restarts container and loops HTTP health probe until HTTP 200               |
|    - Outputs structured JSON audit record to stdout and /ansible/logs/recovery.log                |
+-------------------------------------------------+-------------------------------------------------+
                                                  │
                                                  │ Result Captured by Python AutoHeal
                                                  ▼
+---------------------------------------------------------------------------------------------------+
|                                Post-Remediation Health & Audit                                    |
|    - Python independently verifies target health endpoint                                         |
|    - SQLite updated with exit code, duration, health verification, and output snippet             |
|    - Cooldown window recorded                                                                     |
|    - Prometheus metrics scraped by Prometheus (:9090)                                             |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Integration Details & Python-Ansible Interface

### Safe Subprocess Execution Interface
The AutoHeal engine executes the Ansible runner via Python's standard `subprocess.run` with an array of fixed arguments. **`shell=True` is strictly forbidden**, preventing command injection.

```python
cmd = [
    settings.DOCKER_BIN, # "docker"
    "run",
    "--rm",
    "--network", settings.DOCKER_NETWORK, # "multiflow_movieflow_net"
    "-v", f"{settings.DOCKER_SOCK}:{settings.DOCKER_SOCK}",
    settings.ANSIBLE_RUNNER_IMAGE, # "movieflow-ansible-runner:latest"
    "python", "scripts/run_recovery.py",
    action, # Fixed identifier strictly from ACTION_PLAYBOOK_MAP
    "--request-id", safe_incident_id,
    "--source", "autoheal_engine",
]
if not dry_run:
    cmd.append("--execute")
```

No parameters from incoming Alertmanager payloads (labels, annotations, generator URLs, or user text) are ever interpolated into the command array or environment variables.

### Deterministic Action-to-Playbook Mapping
| Action Identifier | Target Service | Target Container | Playbook Path | Health Verification Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| `restart_backend` | `backend` | `movieflow_backend` | `playbooks/recover_backend.yml` | `http://backend:8000/api/core/health/` |
| `restart_frontend` | `frontend` | `movieflow_frontend` | `playbooks/recover_frontend.yml` | `http://frontend:3000/api/health` |
| `restart_redis` | `redis` | `movieflow_redis` | `playbooks/recover_redis.yml` | `tcp://redis:6379` |
| `health_check` | `all` | *All containers* | `playbooks/health_check.yml` | *Probes all 6 core components* |

---

## 3. Execution Modes

Configured via the environment variable `EXECUTION_MODE`:

### Mode A: `DRY_RUN` (Default & Enforced in Phase 8)
- Python evaluates incoming alerts and generates healing decisions.
- Python invokes Ansible runner in check mode (`--check`).
- Ansible inspects container state and verifies health without restarting containers.
- Outcome recorded as `status: "SIMULATED"`, `dry_run: true`.
- Zero application downtime or container restarts occur.

### Mode B: `APPROVAL_REQUIRED`
- Recovery decisions are placed in `pending` approval status (`approval_status: "pending"`).
- Automated execution is halted until an operator authorizes the action.
- Approvals are granted via `POST /recovery/approve/{incident_id}` requiring the secret authorization header `X-AutoHeal-Key`.
- Approvals are cryptographically bound to the recorded incident's original service and action (cannot be modified by the caller).
- Approvals expire after 900 seconds (15 minutes).

### Mode C: `AUTO_RECOVERY` (Disabled by Default)
- Designed for autonomous unattended remediation in later phases.
- Multi-layer safeguards prevent accidental activation:
  - Requires `EXECUTION_MODE=AUTO_RECOVERY`
  - Requires `ENABLE_AUTO_RECOVERY=True`
  - Requires `CONFIRM_DANGEROUS_AUTO_RECOVERY="I_UNDERSTAND_THE_RISKS"`
- **Strictly disabled during Phase 8 testing.**

---

## 4. Safety Controls & Policy Enforcement

1. **Action Allowlist:**
   Only `restart_backend`, `restart_frontend`, and `restart_redis` can be executed. Any arbitrary action string is dropped immediately before execution.
2. **PostgreSQL Absolute Prohibition:**
   Any request targeting `postgres`, `postgresql`, `database`, or `db` unconditionally aborts with `SKIPPED_FORBIDDEN_SERVICE`. Automated restarts on primary database storage risk transaction log corruption and are strictly reserved for human DBAs.
3. **Monitoring Stack Protection:**
   Services `prometheus`, `alertmanager`, `grafana`, `cadvisor`, `node-exporter`, and `autoheal` cannot be restarted by AutoHeal to prevent recursive failure loops.
4. **Alert State Verification:**
   Only alerts in the `firing` state trigger recovery. Resolved alerts update active incidents and produce `no_action`.
5. **Persistent Cooldown:**
   Each service has a persistent 300-second (5-minute) cooldown window stored in SQLite. Multiple firing alerts within this window receive `SKIPPED_COOLDOWN`.
6. **Circuit Breaker Loop Protection:**
   Tracks consecutive remediation failures per service. After 3 consecutive failures, the breaker transitions to `OPEN`, halting all recovery attempts and alerting operators that manual intervention is required.
7. **Maximum Attempt Limits:**
   Limits remediation to at most 3 attempts per individual incident UUID.
8. **Confidence Threshold:**
   Only decisions with `confidence >= 0.90` are eligible for recovery dispatch. Resource investigation alerts (`HighHostCPUUsage`, `LowHostMemory`) produce `investigate_resource_usage` which is manual only.

---

## 5. Database Schema & Safe Migrations

The SQLite database (`/data/autoheal.db`) was extended using safe, non-destructive `ALTER TABLE` statements:

### Extended `incidents` Table Columns
- `approval_status`: `not_required`, `pending`, `approved`, `rejected`, `expired`
- `approval_time`: ISO 8601 timestamp of operator action
- `approved_by`: Identity of authorizing operator or system
- `recovery_status`: `none`, `SIMULATED`, `SUCCESS`, `FAILED`, `TIMEOUT`, `SKIPPED_*`
- `recovery_action`: Action identifier dispatched
- `recovery_start_time`: Execution start timestamp
- `recovery_end_time`: Execution end timestamp
- `recovery_duration`: Duration in seconds
- `ansible_exit_code`: Subprocess returncode
- `ansible_output_summary`: Output snippet from Ansible
- `health_verification_result`: `HEALTHY` or `UNVERIFIED`
- `cooldown_state`: Active countdown information
- `attempt_number`: Cumulative attempts for this incident
- `circuit_breaker_state`: Current circuit breaker state (`closed`, `open`, `half_open`)
- `failure_reason`: Error description if unsuccessful

### Auxiliary Tables
- `service_cooldowns` (`service` PK, `last_recovery_time`, `cooldown_until`, `last_action`): Persists cooldown state across container restarts.
- `circuit_breakers` (`service` PK, `state`, `consecutive_failures`, `last_failure_time`, `tripped_time`): Persists circuit breaker state across container restarts.
- `recovery_history` (`id` PK, `incident_id`, `service`, `action`, `execution_mode`, `status`, `start_time`, `end_time`, `duration`, `exit_code`, `details`, `output_snippet`): Append-only audit log.

---

## 6. API Reference

All existing Phase 6 endpoints remain fully functional, augmented with new Phase 8 management endpoints:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/health` | Application health and database connection probe | No |
| `GET` | `/status` | Engine operational status, mode, and incident metrics | No |
| `POST` | `/webhook/alerts` | Alertmanager webhook receiver (triggers decision & remediation) | No (Internal) |
| `GET` | `/incidents` | Query incident history with optional status and service filters | No |
| `GET` | `/incidents/{id}` | Detailed incident report and full recovery audit trace | No |
| `GET` | `/recovery/status` | Operational recovery status, circuit breakers, and active cooldowns | No |
| `GET` | `/recovery/history` | Historical log of executed recovery runs | No |
| `GET` | `/recovery/cooldowns` | Current cooldown status and remaining countdowns per service | No |
| `GET` | `/recovery/pending` | List of incidents awaiting manual operator approval | No |
| `POST` | `/recovery/approve/{id}`| Securely authorize a pending recovery action | **Yes** (`X-AutoHeal-Key`) |
| `POST` | `/recovery/reject/{id}` | Securely reject a pending recovery action | **Yes** (`X-AutoHeal-Key`) |
| `GET` | `/metrics` | Prometheus text exposition metrics for scraping | No |

---

## 7. Prometheus Metrics Exposition

Exposed at `GET /metrics` and scraped by Prometheus (`job: autoheal`):

- `autoheal_recovery_attempts_total{service="...", action="...", mode="..."}`: Cumulative recovery attempts.
- `autoheal_recovery_success_total{service="...", action="..."}`: Verified successful recoveries.
- `autoheal_recovery_failure_total{service="...", action="..."}`: Failed recoveries.
- `autoheal_recovery_simulated_total{service="...", action="..."}`: Dry-run simulated recoveries.
- `autoheal_recovery_duration_seconds{service="...", action="..."}`: Execution duration of last recovery.
- `autoheal_pending_approvals{service="..."}`: Number of incidents pending approval.
- `autoheal_circuit_breaker_tripped{service="..."}`: Gauge (1 if tripped/OPEN, 0 if CLOSED).
- `autoheal_cooldown_skips_total{service="..."}`: Recoveries skipped due to active cooldown.

Labels are strictly bounded (no UUIDs or dynamic strings) to prevent Prometheus high-cardinality time-series explosions.

---

## 8. Test Results & Verification

43 automated tests were written and executed inside the container:

```bash
docker compose exec autoheal pytest -v
```

### Test Suite Breakdown
1. **`tests/test_classifier.py` (8 tests):** Validates classification of all MovieFlow alert rules.
2. **`tests/test_decision_engine.py` (6 tests):** Validates rule-based recommendations, confidence scores, and safety defaults.
3. **`tests/test_incident_store.py` (4 tests):** Validates SQLite migrations, deduplication, and resolution tracking.
4. **`tests/test_integration.py` (10 tests):**
   - Action playbook mapping verification
   - Unknown action rejection
   - Resolved alert rejection
   - Low confidence rejection
   - Cooldown enforcement and SQLite persistence
   - Circuit breaker tripping (3 failures -> OPEN) and probationary reset
   - Timeout handling (`subprocess.TimeoutExpired` -> status `TIMEOUT`, exit code 124)
   - Missing runner image handling (exit code 125 -> status `FAILED`)
   - Dry-run simulation execution
   - API endpoints (`/recovery/status`, `/recovery/cooldowns`, `/recovery/history`, `/metrics`)
5. **`tests/test_phase8_security.py` (7 tests):**
   - PostgreSQL recovery hard block (`SKIPPED_FORBIDDEN_SERVICE`)
   - Monitoring infrastructure recovery hard block
   - Unapproved service rejection (`bitcoin_miner` -> `SKIPPED_UNAPPROVED_SERVICE`)
   - Command injection through alert labels/annotations produces zero effect on fixed command list
   - Approval endpoint rejects requests missing valid `X-AutoHeal-Key` token (HTTP 401)
   - Approval flow enforces strict binding to original incident service/action
   - Auto-recovery cannot be activated accidentally
6. **`tests/test_safety.py` (3 tests):** Validates allowlist and dry-run default.
7. **`tests/test_webhook.py` (5 tests):** Validates single/batch webhook ingestion and query endpoints.

**Result:** `43 passed, 1 warning in 1.73s (100% pass rate)`.

---

## 9. PowerShell Operational Runbook

### Checking AutoHeal Status & Metrics
```powershell
# Check engine health and SQLite connection
Invoke-RestMethod -Uri "http://localhost:5001/health"

# Check operational mode and incident metrics
Invoke-RestMethod -Uri "http://localhost:5001/status"

# Inspect active cooldowns and circuit breakers
Invoke-RestMethod -Uri "http://localhost:5001/recovery/status" | ConvertTo-Json -Depth 5

# View Prometheus metrics exposition
curl.exe -s http://localhost:5001/metrics
```

### Viewing Logs
```powershell
# Stream live AutoHeal logs
docker compose logs -f autoheal

# Stream live Alertmanager logs
docker compose logs -f alertmanager

# View Ansible runner execution log inside container
docker compose exec autoheal cat /ansible/logs/recovery.log
```

### Sending a Synthetic Alert (Dry-Run Verification)
```powershell
# Send synthetic alert through Alertmanager (group_wait = 10s)
$body = '[{"labels":{"alertname":"BackendUnavailable","service":"backend","severity":"critical","category":"availability"},"annotations":{"summary":"Synthetic probe failure for Backend"},"startsAt":"' + (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") + '"}]'
Invoke-RestMethod -Uri "http://localhost:9093/api/v2/alerts" -Method Post -Body $body -ContentType "application/json"

# Check incident recorded
Invoke-RestMethod -Uri "http://localhost:5001/incidents?limit=1" | ConvertTo-Json -Depth 5
```

---

## 10. Docker Socket Security & Remaining Risks

The Ansible execution architecture requires interacting with the Docker engine to inspect container states and issue restart directives:

### Mitigations Implemented
1. **Isolated Execution:** Ansible playbooks execute inside a dedicated runner container (`movieflow-ansible-runner:latest`).
2. **Deterministic Invocation:** Subprocess calls pass strictly fixed action names matching an approved server-side dictionary (`restart_backend`, `restart_frontend`, `restart_redis`).
3. **No Shell Interpolation:** `subprocess.run(cmd, shell=False)` ensures arguments cannot be escaped or chained with shell operators.
4. **No Destructive Commands:** Playbooks issue only `restart: yes`. Container removal (`state: absent`), image deletion, or volume purging commands are strictly absent.
5. **No Network Exposure:** The Ansible runner container exposes zero host or external network ports.

### Remaining Risks & Production Recommendations
- **Docker Socket Access (`/var/run/docker.sock`):** The AutoHeal container mounts the Docker socket to spawn ephemeral Ansible runner containers. Anyone with root command execution inside the AutoHeal container could theoretically communicate with the Docker daemon to escape container isolation.
- **Production Hardening (Future Work):** In a production Kubernetes or multi-node cluster, Docker socket mounting should be eliminated in favor of an authenticated, scoped Kubernetes ServiceAccount with Pod restart RBAC permissions (`apps/v1` restart deployment), or an isolated gRPC/mTLS worker daemon running on an isolated bastion host.

---

## 11. Work Remaining for Phase 9

Phase 9 will focus on:
1. **Grafana Dashboards:** Visualizing AutoHeal metrics (`autoheal_recovery_attempts_total`, cooldowns, circuit breakers, and recovery history) directly inside the Grafana UI.
2. **Alertmanager Dashboard Annotations:** Overlaying recovery events on Prometheus time-series graphs.
3. **End-to-End Fault Injection Testing:** Controlled testing of actual container failures once explicit permission for real recovery is granted.
