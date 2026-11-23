# MovieFlow Ansible Recovery Automation Setup & Guide

This document details the architecture, safety rules, playbooks, execution interfaces, and testing procedures for the **Ansible Recovery Automation** platform developed during **Phase 7** of the **INT333 MovieFlow AutoHeal** project.

---

## 1. Architecture Overview

Ansible operates as a containerized, self-contained remediation execution layer. In Phase 8, the recovery environment is fully integrated with the Python AutoHeal engine through a controlled subprocess execution interface, verified in dry-run mode, and tested end-to-end with Alertmanager.

```
+---------------------------------------------------------------------------------------------------+
|                                 MovieFlow AutoHeal Ecosystem                                      |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  | Incident Identified
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                 Phase 6: Python AutoHeal Engine                                   |
|                        - Ingests Alertmanager webhook at :5001/webhook/alerts                     |
|                        - Classifies incident & generates HealingDecision                          |
|                        - Evaluates cooldown (+300s) & enforces Action Allowlist                   |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  | Controlled Execution Request
                                                  | (Action: restart_backend / restart_frontend / ...)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                            Phase 7: Ansible Execution Runner Interface                            |
|                                    Container: movieflow-ansible-runner                            |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   | 1. Action Mapping & Strict Allowlist Guardrails (scripts/run_recovery.py)                 |   |
|   |    - Rejects unlisted actions or unapproved target services                               |   |
|   |    - Blocks any remediation targeting PostgreSQL unconditionally                          |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 |                                                 |
|                                                 v                                                 |
|   +-------------------------------------------------------------------------------------------+   |
|   | 2. Ansible Playbook Execution Engine                                                      |   |
|   |    - ansible.cfg & inventory/hosts.yml                                                    |   |
|   |    - Roles: movieflow_recovery (Safety asserts, container check, dry-run simulation)      |   |
|   |    - Playbooks: recover_backend.yml, recover_frontend.yml, recover_redis.yml              |   |
|   |    - Read-Only Probe: health_check.yml                                                    |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 |                                                 |
|                                                 v                                                 |
|   +-------------------------------------------------------------------------------------------+   |
|   | 3. Docker Management & Post-Remediation Health Verification                               |   |
|   |    - Communicates via /var/run/docker.sock with minimal permissions                       |   |
|   |    - Probes health endpoint until HTTP 200 is confirmed                                    |   |
|   |    - Writes structured recovery audit records to /ansible/logs/recovery.log               |   |
|   +-------------------------------------------------------------------------------------------+   |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  | Direct Docker Socket & Network Calls
                                                  v
                                      +-----------------------+
                                      | MovieFlow Containers  |
                                      | [backend]  [frontend] |
                                      | [redis]    [postgres] |
                                      +-----------------------+
```

---

## 2. Dedicated Execution Environment

### Windows-Compatible Containerized Execution
Ansible control nodes cannot run natively on Windows host shells. Rather than requiring users to manually configure WSL or third-party paid GUIs, the execution engine is fully packaged in a lightweight Debian-based container (`movieflow-ansible-runner:latest`):

- **Base Image:** `python:3.11-slim`
- **Core Engine:** `ansible-core 2.17.14`
- **Container SDK:** `docker 7.2.0`, `requests 2.34.2`, `pyyaml 6.0.4`
- **Ansible Collection:** `community.docker >= 3.10.0`
- **Network Attachment:** Connected directly to `multiflow_movieflow_net` (`movieflow_net`) to allow direct HTTP health probes against internal Docker DNS addresses (`http://backend:8000/api/core/health/`, `http://frontend:3000/api/health`).

---

## 3. Directory & File Structure

```
ansible/
├── ansible.cfg                    # Ansible default configuration (inventory path, roles_path, local connections)
├── inventory/
│   └── hosts.yml                  # Inventory targeting localhost with service/container mappings & health endpoints
├── roles/
│   └── movieflow_recovery/        # Reusable recovery role with safety guards & health verification
│       ├── tasks/main.yml         # 10-step recovery workflow (assertions, inspection, restart, health probe)
│       └── handlers/main.yml      # Audit completion handlers
├── playbooks/
│   ├── recover_backend.yml        # Controlled backend container recovery
│   ├── recover_frontend.yml       # Controlled frontend container recovery
│   ├── recover_redis.yml          # Controlled Redis container recovery
│   └── health_check.yml           # Read-only health probing across all infrastructure
├── scripts/
│   └── run_recovery.py            # Python execution runner with strict allowlist and dry-run default
├── Dockerfile                     # Dedicated containerized Ansible execution environment
├── requirements.txt               # Python and Ansible requirements
└── README.md
```

---

## 4. Safety Constraints & Invariants

The Ansible recovery automation strictly enforces the following guarantees:

1. **Explicit Target Allowlist:** Only `backend`, `frontend`, and `redis` are approved for automated remediation.
2. **Absolute PostgreSQL Protection:** Any remediation targeting `postgres`, `postgresql`, `database`, or `db` immediately trips `[Safety Check 2]` and aborts execution with a fatal error:
   ```text
   CRITICAL SAFETY VIOLATION: Automated remediation on 'postgres' is strictly forbidden!
   ```
3. **Dry-Run by Default:** All playbooks and runners run in check/dry-run mode unless `--extra-vars "execute_recovery=true"` (or `--execute` in `run_recovery.py`) is explicitly supplied.
4. **No Destructive Actions:** Playbooks never recreate containers, never touch Docker volumes, never run `docker compose down`, and never issue prune commands. Remediation is strictly limited to restarting existing, configured containers (`restart: true`).
5. **No Shell Injections:** Playbook names and arguments are selected from fixed dictionary lookups. Arbitrary shell commands or parameters from alert payloads are rejected.
6. **Post-Remediation Verification:** Playbooks do not report success upon container restart; they loop and query the target application's HTTP health endpoint until HTTP 200 is confirmed (retries: 15, delay: 2s).

---

## 5. Docker Permissions & Security Considerations

To inspect and restart approved containers, the Ansible runner mounts the Docker daemon socket (`/var/run/docker.sock`).

### Security Risks
- Mounting the Docker socket grants administrative control over the host Docker daemon.
- A compromised container with Docker socket access could escape isolation or inspect host containers.

### Applied Mitigations
1. **Isolated Execution Interface:** Actions can only be triggered via `scripts/run_recovery.py`, which restricts targets to `backend`, `frontend`, and `redis`.
2. **No Exposed Ports:** The Ansible runner container does not expose any listening ports to the host or external networks.
3. **No Privileged Mode:** The container runs without Docker `--privileged` flags.
4. **No Secret Leakage:** Playbooks suppress credential logging and never inspect `.env` files or database credentials.

---

## 6. Controlled Recovery Interface (`run_recovery.py`)

Located at `ansible/scripts/run_recovery.py`, this script provides a hardened programmatic CLI interface:

### Action Mapping
| Requested Action | Playbook Invoked | Target Service | Container Target |
|---|---|---|---|
| `restart_backend` | `playbooks/recover_backend.yml` | `backend` | `movieflow_backend` |
| `restart_frontend` | `playbooks/recover_frontend.yml` | `frontend` | `movieflow_frontend` |
| `restart_redis` | `playbooks/recover_redis.yml` | `redis` | `movieflow_redis` |
| `health_check` | `playbooks/health_check.yml` | `all` | *Read-only probes* |

### CLI Usage
```bash
# Dry-run backend recovery simulation (Default)
python scripts/run_recovery.py restart_backend

# Read-only health probe across all infrastructure
python scripts/run_recovery.py health_check

# Explicit real execution (Requires --execute flag)
python scripts/run_recovery.py restart_backend --execute --request-id "REQ-123"
```

### Structured Output Format
```json
{
  "request_id": "9c63a435-229e-46e7-a35f-932e8333b1b5",
  "action": "restart_backend",
  "target_service": "backend",
  "source": "cli",
  "dry_run": true,
  "start_time": "2026-11-23T04:36:08Z",
  "end_time": "2026-11-23T04:36:41Z",
  "status": "SUCCESS",
  "exit_code": 0,
  "health_verified": true
}
```

---

## 7. Verification & Test Results

All 10 verification scenarios required by Phase 7 were tested and validated:

| Test Case | Command Executed | Expected Outcome | Result |
|---|---|---|---|
| **1. Syntax Check** | `ansible-playbook playbooks/*.yml --syntax-check` | Zero syntax errors | **PASSED (All 4 playbooks)** |
| **2. Inventory Validation** | `ansible-inventory --list` | JSON tree with hosts & variables | **PASSED** |
| **3. Health Check Playbook** | `ansible-playbook playbooks/health_check.yml` | Probe 6 services without modifying state | **PASSED (All 6 HEALTHY)** |
| **4. Dry-Run Backend** | `ansible-playbook playbooks/recover_backend.yml --check` | Verify existence, simulate restart | **PASSED (0 changed)** |
| **5. Dry-Run Frontend** | `ansible-playbook playbooks/recover_frontend.yml --check` | Verify existence, simulate restart | **PASSED (0 changed)** |
| **6. Dry-Run Redis** | `ansible-playbook playbooks/recover_redis.yml --check` | Verify existence, simulate restart | **PASSED (0 changed)** |
| **7. Service Allowlist** | `run_recovery.py` with valid services | Approved actions proceed | **PASSED** |
| **8. Invalid Target Rejection** | `--extra-vars "target_service=bitcoin_miner"` | Immediate failure at Safety Check 3 | **PASSED (Blocked)** |
| **9. PostgreSQL Protection** | `--extra-vars "target_service=postgres"` | Immediate failure at Safety Check 2 | **PASSED (Blocked)** |
| **10. Python Interface Test** | `python scripts/run_recovery.py health_check` | Output structured JSON audit record | **PASSED** |

---

## 8. Integration Architecture for Phase 8

In Phase 8, the Python AutoHeal Engine (`movieflow_autoheal`) will be connected to the Ansible runner:

```
[ Alertmanager ] ---> [ Python AutoHeal Engine ]
                             │
                             ├─ 1. Ingest alert & classify
                             ├─ 2. Evaluate cooldown & confidence
                             ├─ 3. Check DRY_RUN environment flag
                             │
                             ▼ (If DRY_RUN=False and Action Approved)
                   [ Ansible Execution Interface ]
                             │
                             ├─ 4. Invoke run_recovery.py via container exec or REST agent
                             ├─ 5. Ansible verifies container & executes controlled restart
                             ├─ 6. Ansible probes HTTP health until 200 OK
                             │
                             ▼
                   [ Audit Log Stored in SQLite ]
```

- When `DRY_RUN=True` (default), AutoHeal only logs decisions without triggering Ansible.
- When `DRY_RUN=False`, AutoHeal issues a non-blocking execution request to `run_recovery.py`, parses the resulting JSON audit record, and updates the incident record in SQLite with remediation duration and health status.
