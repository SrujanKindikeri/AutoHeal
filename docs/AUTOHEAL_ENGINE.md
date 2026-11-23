# MovieFlow Python AutoHeal Engine Setup & Operations Guide

This document provides a comprehensive operational guide for the **Python AutoHeal Engine** implemented in **Phase 6** of the **INT333 MovieFlow AutoHeal** project.

---

## 1. Engine Architecture & Incident Lifecycle

The AutoHeal Engine is a standalone, lightweight, asynchronous service built with **FastAPI** and **SQLite (WAL mode)**. It receives alert webhooks from Prometheus Alertmanager, classifies incidents into standard service domains, generates deterministic healing recommendations using a rule-based decision engine, and persists incident audit history.

```
+---------------------------------------------------------------------------------------------------+
|                                      Prometheus Alertmanager                                      |
|                                       (Port 9093 / Internal)                                      |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  | HTTP POST /webhook/alerts (JSON payload)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                     MovieFlow AutoHeal Service                                    |
|                                   Container: movieflow_autoheal                                   |
|                                     (Host & Internal Port 5001)                                   |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   | 1. Webhook Ingestion & Validation (Pydantic models, malformed input rejection)            |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 |                                                 |
|                                                 v                                                 |
|   +-------------------------------------------------------------------------------------------+   |
|   | 2. Incident Classification (Maps alerts to service domain & category)                     |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 |                                                 |
|                                                 v                                                 |
|   +-------------------------------------------------------------------------------------------+   |
|   | 3. Rule-Based Decision Engine (Evaluates alert state, confidence, allowlist & cooldown)   |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 |                                                 |
|                                                 v                                                 |
|   +-------------------------------------------------------------------------------------------+   |
|   | 4. Incident Store & Audit History (SQLite WAL mode, deduplication, resolution tracking)   |   |
|   +-------------------------------------------------------------------------------------------+   |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  | Persistent named volume: autoheal_data
                                                  v
                                      +-----------------------+
                                      |   /data/autoheal.db   |
                                      +-----------------------+
```

### Incident Lifecycle
1. **Webhook Ingestion:** Alertmanager batches active or resolved alerts and POSTs them to `/webhook/alerts`.
2. **Schema Validation:** Pydantic validates the alert payload structure. Malformed or command injection payloads are rejected or sanitized.
3. **Classification:** Alerts are mapped into standardized services (`backend`, `frontend`, `monitoring`, `infrastructure`, `host`, `container`, `unknown`) and categories (`availability`, `target_health`, `resource`, `manual_investigation`).
4. **Decision Generation:** The decision engine assesses whether the alert is firing or resolved, evaluates confidence scores, attaches cooldown metadata, and picks an action from the strict action allowlist.
5. **Persistence & Deduplication:** The incident is stored in SQLite. If a firing incident with the same fingerprint is already active, duplicate actions are prevented. When a resolved webhook arrives, the active incident is marked `resolved` with a timestamp.

---

## 2. Component Details & Deployment

- **Container Name:** `movieflow_autoheal`
- **Image:** `movieflow-autoheal:latest` (built from `./autoheal`)
- **Port:** `5001:5001`
- **Persistent Volume:** `autoheal_data` mounted at `/data`
- **Database Path:** `/data/autoheal.db`
- **Healthcheck:**
  ```bash
  python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001/health')" || exit 1
  ```
- **Network:** Connected to `movieflow_net` alongside application and monitoring containers.
- **Security:** Runs as non-root user `autoheal` (UID 1000). No Docker socket access, no shell utilities, no Ansible binaries.

---

## 3. Webhook Specification (`POST /webhook/alerts`)

The webhook accepts standard Prometheus Alertmanager payloads:

### Request Headers
```http
POST /webhook/alerts HTTP/1.1
Host: autoheal:5001
Content-Type: application/json
```

### Sample Payload
```json
{
  "version": "4",
  "status": "firing",
  "receiver": "critical-receiver",
  "groupLabels": { "alertname": "BackendUnavailable" },
  "commonLabels": { "alertname": "BackendUnavailable", "service": "backend", "severity": "critical" },
  "commonAnnotations": { "summary": "MovieFlow Backend is unreachable" },
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "BackendUnavailable",
        "service": "backend",
        "severity": "critical",
        "category": "availability"
      },
      "annotations": {
        "summary": "MovieFlow Backend is unreachable or unhealthy",
        "description": "Blackbox probe to http://backend:8000/api/core/health/ failed for more than 30 seconds."
      },
      "startsAt": "2026-11-23T00:00:00Z",
      "fingerprint": "fp-backend-avail-1"
    }
  ]
}
```

### Response Schema
```json
{
  "status": "processed",
  "processed_count": 1,
  "incidents": [
    {
      "incident_id": "24ec83ed-c633-47da-a972-b396c14cad35",
      "fingerprint": "fp-backend-avail-1",
      "alert_name": "BackendUnavailable",
      "service": "backend",
      "severity": "critical",
      "category": "availability",
      "alert_state": "firing",
      "recommended_action": "restart_backend",
      "reason": "Backend HTTP health check failed continuously for >30s. Recommend restarting Daphne ASGI container.",
      "confidence": 0.95,
      "execution_mode": "dry_run",
      "cooldown_seconds": 300,
      "can_execute_after": "2026-11-22T22:16:54.172388+00:00",
      "timestamp": "2026-11-22T22:11:54.172388+00:00"
    }
  ]
}
```

---

## 4. Incident Classification Mapping

Implemented in `autoheal/app/classifier.py`:

| Incoming Alert Name | Service Domain | Incident Category | Known Rule |
|---|---|---|---|
| `BackendUnavailable` | `backend` | `availability` | Yes |
| `FrontendUnavailable` | `frontend` | `availability` | Yes |
| `MonitoringStackDown` | `monitoring` | `availability` | Yes |
| `MonitoringTargetDown` | `infrastructure` | `target_health` | Yes |
| `HighHostCPUUsage` | `host` | `resource` | Yes |
| `LowHostMemory` | `host` | `resource` | Yes |
| `ContainerHighMemoryUsage` | `container` | `resource` | Yes |
| *(Any Unrecognized Alert)* | `unknown` | `manual_investigation` | No |

---

## 5. Rule-Based Decision Logic

Implemented in `autoheal/app/decision_engine.py`:

```
                       [ Incoming Alert ]
                                |
                   Is alert status 'resolved'?
                     /                     \
                   Yes                      No
                   /                         \
      [ Action: no_action ]        Is alert rule recognized?
      Confidence: 1.00               /                     \
                                   Yes                      No
                                   /                         \
                     Match Rule to Action:       [ Action: manual_investigation ]
                     - Backend -> restart_backend    Confidence: 0.50
                     - Frontend -> restart_frontend
                     - Monitoring -> investigate_monitoring
                     - Resource -> investigate_resource_usage
                                   |
                     Enforce Action Allowlist Check
                                   |
                     Attach Cooldown (+300s) & DRY_RUN Mode
```

### Action Allowlist
Only actions explicitly enumerated in `settings.ALLOWED_ACTIONS` can be returned:
- `restart_backend`
- `restart_frontend`
- `investigate_monitoring`
- `investigate_resource_usage`
- `no_action`
- `manual_investigation`

Any attempt to produce an unlisted action forces a downgrade to `manual_investigation` with confidence `0.10`.

---

## 6. HTTP API Reference

| Endpoint | Method | Description | Sample Output / Status |
|---|---|---|---|
| `/health` | `GET` | Health probe checking service state and database connectivity | `{"status": "ok", "service": "autoheal-engine", "dry_run": true}` |
| `/status` | `GET` | Runtime statistics and incident counters | `{"status": "active", "mode": "dry_run", "total_incidents": 2, "firing_incidents": 0, "resolved_incidents": 2}` |
| `/webhook/alerts` | `POST` | Webhook receiver for Alertmanager alerts | `{"status": "processed", "processed_count": 1, "incidents": [...]}` |
| `/incidents` | `GET` | List incidents with optional `status`, `service`, `limit` filters | `[{"incident_id": "...", "alert_name": "...", "status": "resolved"}]` |
| `/incidents/{id}` | `GET` | Retrieve full incident details by UUID | `{"incident_id": "...", "recommended_action": "restart_backend", ...}` |

---

## 7. Persistent Incident Storage (SQLite)

The database schema is initialized automatically in WAL mode on application startup:

```sql
CREATE TABLE IF NOT EXISTS incidents (
    incident_id TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL,
    alert_name TEXT NOT NULL,
    service TEXT NOT NULL,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    received_time TEXT NOT NULL,
    resolution_time TEXT,
    recommended_action TEXT NOT NULL,
    reason TEXT NOT NULL,
    confidence REAL NOT NULL,
    execution_mode TEXT NOT NULL,
    cooldown_until TEXT,
    raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_fingerprint ON incidents (fingerprint);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents (service);
```

### Deduplication Strategy
When a firing alert arrives:
- The store queries for an existing record matching `fingerprint` where `status = 'firing'`.
- If an active firing incident exists, the store reuses the existing incident ID rather than creating duplicate incidents.
- When an alert with `status = 'resolved'` arrives, the store updates the existing firing incident to `status = 'resolved'` and sets `resolution_time`.

---

## 8. Safety & Guardrails (Phase 6 Guarantees)

1. **Default Dry-Run Mode:** `DRY_RUN=True` is the default. Recommendations are calculated, validated, logged, and persisted without modifying live containers.
2. **Zero Execution Capabilities:** The AutoHeal container contains no Docker CLI, has no access to the Docker daemon socket (`/var/run/docker.sock`), has no shell execution privileges, and contains no Ansible playbooks.
3. **Passive Data Safety:** Payloads are validated against Pydantic models. Shell injection attempts (e.g. `; rm -rf /`, `$(whoami)`) in alert labels or annotations are treated as inert strings and routed to `manual_investigation`.
4. **Cooldown Protection:** Each recommendation calculates `can_execute_after` (+300s) to prevent recovery loops in future phases.
5. **Resolved Alert Invariance:** Resolved alerts unconditionally evaluate to `no_action` with 1.0 confidence.

---

## 9. Test Suite Verification

The Python test suite (`pytest`) is located in `autoheal/tests/` and contains 26 comprehensive tests:

```bash
docker run --rm movieflow-autoheal:latest pytest -v tests/
```

### Test Coverage Summary
- `test_classifier.py` (8 tests): Validates mapping of all 7 production alert rules plus unrecognized alerts.
- `test_decision_engine.py` (6 tests): Validates recommendations, confidence scores, resolved alert safety, and unknown alert handling.
- `test_incident_store.py` (4 tests): Validates SQLite table creation, record insertion, deduplication of active alerts, resolution tracking, and filtering.
- `test_safety.py` (3 tests): Validates command injection rejection, action allowlist enforcement, and default dry-run mode.
- `test_webhook.py` (5 tests): Validates single alert webhook, batch alert processing, malformed payload rejection (HTTP 422), `/health`, `/status`, and `/incidents` endpoints.

**Result:** `26 passed in 0.93s (100% pass rate)`.

---

## 10. Phase 8 Ansible Integration (Completed)

In Phase 8, the AutoHeal Engine was fully integrated with the containerized Ansible execution runner:

1. **Dedicated Recovery Executor (`app/recovery_executor.py`):**
   - Dispatches approved remediation actions directly to `movieflow-ansible-runner:latest`.
   - Enforces execution modes: `DRY_RUN` (default), `APPROVAL_REQUIRED`, `AUTO_RECOVERY`.
   - Restricts commands to fixed server-side mappings with zero shell interpolation.
2. **Safety Systems:**
   - Multi-tier action allowlist: `restart_backend`, `restart_frontend`, `restart_redis`.
   - Hard block on PostgreSQL and monitoring services.
   - Persistent cooldown tracking via SQLite across service restarts.
   - Circuit breaker (trips to `OPEN` after 3 consecutive failures to prevent restart loops).
3. **Enhanced APIs & Observability:**
   - Operational recovery status: `GET /recovery/status`
   - Execution audit history: `GET /recovery/history`
   - Cooldown countdowns: `GET /recovery/cooldowns`
   - Pending approvals: `GET /recovery/pending`, `POST /recovery/approve/{id}`, `POST /recovery/reject/{id}`
   - Prometheus metrics exposition: `GET /metrics`
4. **Testing:**
   - 43 automated unit, integration, and security tests passing 100%.

For full architecture and operational workflows, see `docs/AUTOHEAL_INTEGRATION.md`.
