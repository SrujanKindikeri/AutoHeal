#!/usr/bin/env python3
"""
MovieFlow Controlled Ansible Recovery Execution Interface
Provides deterministic action-to-playbook mapping, allowlist enforcement,
dry-run safety defaults, and structured recovery audit logging.
"""

import sys
import os
import json
import uuid
import argparse
import subprocess
from datetime import datetime, timezone
from pathlib import Path

# Fixed recovery action to playbook mapping (strictly controlled; no dynamic paths)
ACTION_PLAYBOOK_MAP = {
    "restart_backend": {
        "playbook": "playbooks/recover_backend.yml",
        "target_service": "backend",
        "description": "Restart MovieFlow Django/Daphne ASGI backend container"
    },
    "restart_frontend": {
        "playbook": "playbooks/recover_frontend.yml",
        "target_service": "frontend",
        "description": "Restart MovieFlow Next.js standalone web frontend container"
    },
    "restart_redis": {
        "playbook": "playbooks/recover_redis.yml",
        "target_service": "redis",
        "description": "Restart MovieFlow Redis cache & channels container"
    },
    "health_check": {
        "playbook": "playbooks/health_check.yml",
        "target_service": "all",
        "description": "Read-only infrastructure and application health probe"
    }
}

FORBIDDEN_SERVICES = {
    "postgres", "postgresql", "database", "db",
    "prometheus", "alertmanager", "grafana",
    "node-exporter", "cadvisor"
}

LOGS_DIR = Path("/ansible/logs")
LOGS_FILE = LOGS_DIR / "recovery.log"

def ensure_logs_dir():
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass

def log_record(record: dict):
    ensure_logs_dir()
    try:
        with open(LOGS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except OSError:
        pass

def main():
    parser = argparse.ArgumentParser(description="MovieFlow Controlled Ansible Recovery Runner")
    parser.add_argument("action", choices=list(ACTION_PLAYBOOK_MAP.keys()), help="Controlled recovery action")
    parser.add_argument("--execute", action="store_true", default=False, help="Explicitly enable real recovery (default is dry-run)")
    parser.add_argument("--request-id", type=str, default=None, help="Tracking incident request ID")
    parser.add_argument("--source", type=str, default="cli", help="Caller source identity")
    args = parser.parse_args()

    request_id = args.request_id or str(uuid.uuid4())
    start_time = datetime.now(timezone.utc).isoformat()
    action = args.action
    action_info = ACTION_PLAYBOOK_MAP[action]
    target_service = action_info["target_service"]
    playbook_file = action_info["playbook"]
    dry_run = not args.execute

    # Security Check: Guard against forbidden services
    if target_service in FORBIDDEN_SERVICES:
        record = {
            "request_id": request_id,
            "action": action,
            "target_service": target_service,
            "source": args.source,
            "dry_run": dry_run,
            "start_time": start_time,
            "end_time": datetime.now(timezone.utc).isoformat(),
            "status": "ABORTED_FORBIDDEN_TARGET",
            "error": f"Target service '{target_service}' is strictly forbidden from automated recovery."
        }
        log_record(record)
        print(json.dumps(record, indent=2))
        sys.exit(2)

    # Base ansible-playbook command arguments (structured array to avoid shell injection)
    cmd = [
        "ansible-playbook",
        playbook_file,
    ]

    # Health-check is inherently read-only; recovery playbooks use check mode unless explicitly executed
    if action == "health_check":
        pass
    elif dry_run:
        cmd.append("--check")
    else:
        cmd.extend(["--extra-vars", "execute_recovery=true"])

    # Execute ansible-playbook safely
    try:
        result = subprocess.run(
            cmd,
            cwd="/ansible",
            capture_output=True,
            text=True,
            check=False
        )

        end_time = datetime.now(timezone.utc).isoformat()
        is_success = (result.returncode == 0)

        record = {
            "request_id": request_id,
            "action": action,
            "target_service": target_service,
            "source": args.source,
            "dry_run": dry_run,
            "start_time": start_time,
            "end_time": end_time,
            "status": "SUCCESS" if is_success else "FAILED",
            "exit_code": result.returncode,
            "stdout_snippet": result.stdout[-1500:] if result.stdout else "",
            "stderr_snippet": result.stderr[-1000:] if result.stderr else "",
            "health_verified": is_success
        }

        log_record(record)
        print(json.dumps(record, indent=2))
        sys.exit(result.returncode)

    except Exception as ex:
        end_time = datetime.now(timezone.utc).isoformat()
        record = {
            "request_id": request_id,
            "action": action,
            "target_service": target_service,
            "source": args.source,
            "dry_run": dry_run,
            "start_time": start_time,
            "end_time": end_time,
            "status": "ERROR",
            "error": str(ex)
        }
        log_record(record)
        print(json.dumps(record, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
