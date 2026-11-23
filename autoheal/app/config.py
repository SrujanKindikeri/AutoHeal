import os
from pathlib import Path
from typing import Set, Dict, Any

class Settings:
    APP_NAME: str = "MovieFlow AutoHeal Engine"
    APP_VERSION: str = "1.1.0"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "5001"))
    
    # Execution modes: DRY_RUN (default), APPROVAL_REQUIRED, AUTO_RECOVERY
    EXECUTION_MODE: str = os.getenv("EXECUTION_MODE", "DRY_RUN").upper()
    
    # Safety: DRY_RUN boolean flag (True if mode is DRY_RUN or DRY_RUN env is true)
    DRY_RUN: bool = (
        EXECUTION_MODE == "DRY_RUN" or
        os.getenv("DRY_RUN", "True").lower() in ("true", "1", "yes", "t")
    )
    
    # Auto-recovery safeguard (must be explicitly enabled and confirmed)
    ENABLE_AUTO_RECOVERY: bool = os.getenv("ENABLE_AUTO_RECOVERY", "False").lower() in ("true", "1", "yes", "t")
    CONFIRM_DANGEROUS_AUTO_RECOVERY: str = os.getenv("CONFIRM_DANGEROUS_AUTO_RECOVERY", "")
    
    # Approval Security
    APPROVAL_TOKEN: str = os.getenv("AUTOHEAL_API_KEY", "autoheal-secure-recovery-token-2025")
    APPROVAL_EXPIRY_SECONDS: int = int(os.getenv("APPROVAL_EXPIRY_SECONDS", "900")) # 15 minutes
    
    # Cooldown & Loop Protection
    COOLDOWN_SECONDS: int = int(os.getenv("COOLDOWN_SECONDS", "300")) # 5 minutes
    CIRCUIT_BREAKER_MAX_FAILURES: int = int(os.getenv("CIRCUIT_BREAKER_MAX_FAILURES", "3"))
    CIRCUIT_BREAKER_RESET_SECONDS: int = int(os.getenv("CIRCUIT_BREAKER_RESET_SECONDS", "600")) # 10 minutes
    MAX_RECOVERY_ATTEMPTS_PER_INCIDENT: int = int(os.getenv("MAX_RECOVERY_ATTEMPTS", "3"))
    HIGH_CONFIDENCE_THRESHOLD: float = float(os.getenv("HIGH_CONFIDENCE_THRESHOLD", "0.90"))
    
    # Execution timeouts and Docker runner configuration
    EXECUTION_TIMEOUT_SECONDS: int = int(os.getenv("EXECUTION_TIMEOUT_SECONDS", "60"))
    DOCKER_BIN: str = os.getenv("DOCKER_BIN", "docker")
    DOCKER_SOCK: str = os.getenv("DOCKER_SOCK", "/var/run/docker.sock")
    DOCKER_NETWORK: str = os.getenv("DOCKER_NETWORK", "multiflow_movieflow_net")
    ANSIBLE_RUNNER_IMAGE: str = os.getenv("ANSIBLE_RUNNER_IMAGE", "movieflow-ansible-runner:latest")
    
    # Database path: /data/autoheal.db inside container or local fallback
    _raw_db_path: str = os.getenv("DATABASE_PATH", "/data/autoheal.db")
    
    @property
    def DATABASE_PATH(self) -> str:
        target_path = Path(self._raw_db_path)
        try:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            test_file = target_path.parent / ".perm_check"
            test_file.touch()
            test_file.unlink()
            return str(target_path)
        except (OSError, PermissionError):
            local_fallback = Path(__file__).resolve().parent.parent / "autoheal.db"
            return str(local_fallback)

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

    # Allowed healing actions (All general decisions)
    ALLOWED_ACTIONS: Set[str] = {
        "restart_backend",
        "restart_frontend",
        "restart_redis",
        "investigate_monitoring",
        "investigate_resource_usage",
        "no_action",
        "manual_investigation",
    }

    # Strict allowlist for executable remediation actions
    ALLOWED_RECOVERY_ACTIONS: Set[str] = {
        "restart_backend",
        "restart_frontend",
        "restart_redis",
    }

    # Strict allowlist for remediable target services
    ALLOWED_SERVICES: Set[str] = {
        "backend",
        "frontend",
        "redis",
    }

    # Strictly forbidden services (destructive / stateful / monitoring loops)
    FORBIDDEN_SERVICES: Set[str] = {
        "postgres",
        "postgresql",
        "database",
        "db",
        "prometheus",
        "alertmanager",
        "grafana",
        "cadvisor",
        "node-exporter",
        "blackbox-exporter",
        "autoheal",
    }

    # Deterministic mapping to playbooks and container names
    ACTION_PLAYBOOK_MAP: Dict[str, Dict[str, str]] = {
        "restart_backend": {
            "playbook": "playbooks/recover_backend.yml",
            "service": "backend",
            "container": "movieflow_backend",
            "health_endpoint": "http://backend:8000/api/core/health/"
        },
        "restart_frontend": {
            "playbook": "playbooks/recover_frontend.yml",
            "service": "frontend",
            "container": "movieflow_frontend",
            "health_endpoint": "http://frontend:3000/api/health"
        },
        "restart_redis": {
            "playbook": "playbooks/recover_redis.yml",
            "service": "redis",
            "container": "movieflow_redis",
            "health_endpoint": "tcp://redis:6379"
        },
        "health_check": {
            "playbook": "playbooks/health_check.yml",
            "service": "all",
            "container": "all",
            "health_endpoint": "multiple"
        }
    }

settings = Settings()
