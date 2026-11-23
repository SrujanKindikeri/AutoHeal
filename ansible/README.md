# MovieFlow Ansible Recovery Automation (Phases 7 & 8)

This directory contains the Ansible automation platform designed to execute controlled, idempotent, and allowlist-guarded container recoveries for the **MovieFlow AutoHeal** project.

---

## 1. Directory Layout

```
ansible/
├── ansible.cfg                    # Ansible configuration (roles_path, default output, local connections)
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

## 2. Integration Interface (Phase 8)

In Phase 8, the Python AutoHeal engine coordinates with Ansible through `scripts/run_recovery.py` running inside `movieflow-ansible-runner:latest`:

```bash
docker run --rm \
  --network multiflow_movieflow_net \
  -v /var/run/docker.sock:/var/run/docker.sock \
  movieflow-ansible-runner:latest \
  python scripts/run_recovery.py <action> --request-id <UUID> --source autoheal_engine
```

- **Action Mapping:**
  - `restart_backend` -> `playbooks/recover_backend.yml`
  - `restart_frontend` -> `playbooks/recover_frontend.yml`
  - `restart_redis` -> `playbooks/recover_redis.yml`
  - `health_check` -> `playbooks/health_check.yml`
- **Output:** Emits structured JSON audit records to stdout and `/ansible/logs/recovery.log`.
- **Default Mode:** Dry-run (`--check`) mode by default. Real execution requires `--execute`.

---

## 3. Safety Controls & Invariants

1. **Explicit Allowlist:** Only `backend`, `frontend`, and `redis` are permitted for automated remediation.
2. **PostgreSQL Absolute Prohibition:** Any recovery targeting `postgres` or `database` unconditionally aborts with a critical error.
3. **Dry-Run by Default:** Playbooks run in check mode (`--check`) unless explicitly passed `--execute`.
4. **No Destructive Operations:** Does not recreate containers, delete volumes, or issue prune commands.
5. **Post-Remediation Health Checks:** Waits for HTTP 200 on application health endpoints before reporting success.
