# MovieFlow AutoHeal — Live Academic Demonstration Guide
**Course:** INT333 — Cloud Infrastructure & Automation Engineering  
**Project:** MovieFlow AutoHeal — Intelligent Infrastructure Monitoring, Automated Deployment & Self-Healing Platform  
**Target Duration:** 7–10 Minutes  
**Terminal:** Windows PowerShell (Host)  
**Safety Mandate:** All commands are **strictly read-only and non-destructive**. No container restarts, kills, or modifications are executed during this demonstration.

---

## Demonstration Overview & Timing Agenda

| Step | Section / Focus | Format / Tool | Target Duration |
| :---: | :--- | :--- | :---: |
| **Demo 1** | MovieFlow Application Overview | Browser | 1.0 min |
| **Demo 2** | Docker Multi-Container Architecture | Windows PowerShell | 1.0 min |
| **Demo 3** | Prometheus Monitoring & Targets | Browser (`:9090`) | 1.0 min |
| **Demo 4** | Grafana 44-Panel Observability Dashboard | Browser (`:3000`) | 2.0 min |
| **Demo 5** | AutoHeal Daemon REST API & Safety Status | PowerShell / Curl | 1.0 min |
| **Demo 6** | Ansible Recovery Playbook Architecture | Code Inspection | 1.0 min |
| **Demo 7** | Phase 10 Test Suite & Benchmarks | PowerShell / Container Pytest | 1.5 min |
| **Demo 8** | Defensive Safety Architecture & Q&A | Summary & Questions | 1.0 min |

---

## Step-by-Step Demonstration Script

---

### Demo 1 — Introduce MovieFlow Application (1.0 min)

**What to Open:**
Open your web browser and navigate to:
- Frontend: `http://localhost:6060`
- Backend API Health: `http://localhost:8000/api/core/health/`

**What the Audience Should See:**
- The Next.js MovieFlow landing page loads cleanly at port 6060 ("Watch Together. Listen Together.").
- The backend health JSON endpoint returns HTTP 200:
  ```json
  {
    "status": "healthy",
    "service": "movieflow-backend",
    "components": {
      "database": { "status": "up", "engine": "postgresql" },
      "channel_layer": { "status": "up", "backend": "channels_redis" }
    }
  }
  ```

**What to Explain:**
> *"MovieFlow is a distributed, multi-tier social streaming application composed of a Next.js frontend, a Django/Daphne ASGI backend, a PostgreSQL relational database, and a Redis message broker. Notice that the core backend health endpoint actively asserts connectivity to both PostgreSQL and the Redis channel layer. This endpoint forms the foundation of our Blackbox synthetic probing."*

**Troubleshooting Fallback:**
If port 6060 takes a few seconds to hydrate, open `http://localhost:6060/api/health` directly, which returns immediate JSON.

---

### Demo 2 — Show Docker Multi-Container Architecture (1.0 min)

**What to Open:**
Open a Windows PowerShell terminal.

**Exact PowerShell Command:**
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**What the Audience Should See:**
A clean table showing all 11 healthy containers running on the bridge network:
```text
NAMES                                STATUS                    PORTS
movieflow_autoheal                   Up 2 hours (healthy)      0.0.0.0:5001->5001/tcp
movieflow_frontend                   Up 3 hours (healthy)      0.0.0.0:6060->3000/tcp
movieflow_backend                    Up 3 hours (healthy)      0.0.0.0:8000->8000/tcp
movieflow_prometheus                 Up 2 hours (healthy)      0.0.0.0:9090->9090/tcp
movieflow_alertmanager               Up 2 hours (healthy)      0.0.0.0:9093->9093/tcp
movieflow_blackbox_exporter          Up 2 hours (healthy)      0.0.0.0:9115->9115/tcp
movieflow_cadvisor                   Up 2 hours (healthy)      0.0.0.0:8080->8080/tcp
movieflow_grafana                    Up 2 hours (healthy)      0.0.0.0:3000->3000/tcp
movieflow_node_exporter              Up 2 hours (healthy)      0.0.0.0:9100->9100/tcp
movieflow_postgres                   Up 46 hours (healthy)     0.0.0.0:5432->5432/tcp
movieflow_redis                      Up 46 hours (healthy)     0.0.0.0:6379->6379/tcp
```

**What to Explain:**
> *"Here we observe our complete containerized environment. We have decoupled our architecture into four core application services and seven observability and self-healing services. Notice that all containers report `healthy` with zero restarts, confirming continuous operational baseline stability."*

---

### Demo 3 — Prometheus Monitoring & Target Health (1.0 min)

**What to Open:**
Open the browser at: `http://localhost:9090/targets`

**What the Audience Should See:**
- **Targets Page:** All 8 scrape pools show State `UP` (in green):
  - `alertmanager (1/1 up)`
  - `autoheal (1/1 up)`
  - `blackbox-exporter (1/1 up)`
  - `blackbox-http` (2 endpoints: frontend :3000 and backend :8000 both `1/1 up`)
  - `cadvisor (1/1 up)`
  - `node-exporter (1/1 up)`
  - `prometheus (1/1 up)`
- Click **Alerts** in the top navigation bar to show alert rules (`BackendUnavailable`, `FrontendUnavailable`, `MonitoringStackDown`). All rules show green (0 active firing).

**What to Explain:**
> *"Prometheus scrapes all monitoring exporters every 15 seconds. Crucially, notice the two `blackbox-http` synthetic targets: Prometheus does not merely monitor whether the Docker process is running; Blackbox actively sends synthetic HTTP requests to verify that the application layer is returning HTTP 200 OK."*

---

### Demo 4 — Grafana 44-Panel Observability Dashboard (2.0 min)

**What to Open:**
Open the browser at:  
`http://localhost:3000/d/movieflow-infra-dashboard/movieflow-autoheal-e28094-system-observability`  
*(Login if prompted: `admin` / `admin`, skip password change).*

**What the Audience Should See & What to Explain by Row:**

1. **Section A (System Overview & Safety Status):**
   - Point out the prominent blue banner: **`DRY-RUN / SIMULATED (AUTO_RECOVERY: OFF)`**.
   - Explain: *"This banner guarantees that our platform operates under strict SRE safety rules; real automated restarts are disabled, and all actions are evaluated in simulation check-mode."*
   - Show `Overall System Health: HEALTHY`, `Healthy Targets: 8`, and `Active Alerts: 0 FIRING`.
2. **Section B (MovieFlow Service Health):**
   - Point out the real-time latency graphs: Frontend Blackbox probe (~10 ms), Backend probe (~31 ms), and HTTP Status Code tracking (200).
   - Show that PostgreSQL and Redis are monitored dynamically via the backend core API.
3. **Section C & D (Infrastructure & Prometheus Targets):**
   - Show Host CPU utilization from Node Exporter, container memory, and the 8-target health grid.
4. **Section F, G & H (AutoHeal Observability):**
   - Point out the live AutoHeal metrics: `Total Recovery Attempts: 1`, `Simulated: 1`, `Failures: 0`, `Duration: 3.67s`, and `Circuit Breaker: CLOSED (ARMED)`.

---

### Demo 5 — AutoHeal Daemon REST API & Safety Status (1.0 min)

**What to Open:**
Return to PowerShell.

**Exact PowerShell Commands:**
```powershell
# 1. Inspect daemon health and safety mode
curl.exe -s http://localhost:5001/health

# 2. Inspect recovery status and circuit breaker state
curl.exe -s http://localhost:5001/recovery/status
```

**What the Audience Should See:**
1. Health endpoint output:
   ```json
   {"status":"ok","service":"autoheal-engine","version":"1.1.0","dry_run":true,"database_connected":true}
   ```
2. Recovery status output showing active execution mode, circuit breakers closed (0 failures), and cooldown states.

**What to Explain:**
> *"The AutoHeal daemon runs as an independent FastAPI service. Notice the explicit safety responses: `dry_run: true`, `auto_recovery_enabled: false`, and all circuit breakers in the closed, armed state with 0 consecutive failures. All incident records are stored in an internal SQLite database in WAL mode."*

---

### Demo 6 — Ansible Playbook Structure & Idempotency (1.0 min)

**What to Open:**
In your IDE / file explorer, highlight:  
`MultiFlow/MultiFlow/ansible/playbooks/recover_backend.yml`

**What to Explain:**
> *"Rather than relying on brittle shell scripts, our recovery actions are defined as declarative Ansible playbooks. Notice the three-stage structure:
> 1. It asserts container presence without recreation.
> 2. It restarts the container idempotently.
> 3. It polls the health check endpoint until HTTP 200 is verified.
> In our simulation mode, AutoHeal invokes Ansible with `--check`, verifying syntax and task paths without modifying container state."*

---

### Demo 7 — Phase 10 Test Suite & Benchmarks (1.5 min)

**What to Open:**
In PowerShell, execute the isolated unit and integration test suite inside the AutoHeal container:

**Exact PowerShell Command:**
```powershell
docker exec movieflow_autoheal pytest -v
```

**What the Audience Should See:**
All 43 tests pass cleanly in ~9 seconds:
```text
======================== 43 passed, 1 warning in 9.27s =========================
```

**What to Explain:**
> *"Here we run our automated verification suite. Notice the breadth of testing:
> - Test 1–8: Alert classification across all failure types.
> - Test 9–14: Decision engine confidence mapping.
> - Test 29–31: Strict boundary enforcement—verifying that any alert attempting to restart PostgreSQL or Prometheus is immediately rejected with `SKIPPED_FORBIDDEN_SERVICE`.
> - Test 32: Injection security—verifying that command injection payloads in alert labels cannot execute.
> - Test 33–35: Approval authentication and token verification.
> All 43 assertions pass in an isolated test harness using mocks and temporary databases."*

---

### Demo 8 — Safety Architecture & Wrap-Up (1.0 min)

**What to Explain:**
> *"To conclude, MovieFlow AutoHeal implements six concentric safety guardrails:
> 1. **Allowlist:** Only frontend, backend, and redis are remediable.
> 2. **Forbidden Shield:** PostgreSQL and monitoring containers are permanently untouchable.
> 3. **300-Second Cooldown:** Prevents restart loops if a bug is persistent.
> 4. **Circuit Breakers:** Tripping after 3 failures to force operator intervention.
> 5. **Confidence Gating:** Requiring 90% confidence before any action is approved.
> 6. **Dry-Run Mode:** Enforced simulation protecting the entire demonstration environment.
>
> All baseline containers remain 100% healthy, and our platform is ready for questions."*

---

## Troubleshooting & FAQ Quick Reference

| Potential Issue | Quick Fallback Command | Explanation to Examiner |
| :--- | :--- | :--- |
| Grafana prompts for login | Enter `admin` / `admin`, click **Skip** | Standard Grafana security setup; credentials provisioned in compose |
| Target dashboard not visible | Click Search -> select `MovieFlow AutoHeal — System Observability` | Provisioned automatically via `dashboard_provider.yml` |
| Pytest shows deprecation warning | Safe to ignore; points to Starlette TestClient package | TestClient warning does not impact test assertion results |
| Query on real failure execution | Refer to Phase 10 report and explain safe simulation | State clearly that real physical failure injection was deferred to Stage 2 |
