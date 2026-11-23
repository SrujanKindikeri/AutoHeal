import json
import os
import re
import socket
import subprocess
import threading
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple, Set

from app.config import settings
from app.models import (
    HealingDecision,
    AlertmanagerAlert,
    RecoveryExecutionResult,
)
from app.incident_store import incident_store
from app.cooldown import cooldown_manager
from app.circuit_breaker import circuit_breaker_manager
from app.metrics import metrics_registry
from app.logging_config import logger

UUID_REGEX = re.compile(r"^[0-9a-fA-F-]{36}$")

class RecoveryExecutor:
    """
    Dedicated recovery executor orchestrating safe Ansible-based self-healing.
    Enforces multi-layer safety checks, execution modes, action allowlists,
    circuit breakers, persistent cooldowns, and post-recovery health probes.
    """

    def __init__(self):
        self._active_executions: Set[str] = set()
        self._execution_lock = threading.Lock()

    def handle_decision(
        self,
        decision: HealingDecision,
        alert: AlertmanagerAlert,
        force_execute: bool = False,
    ) -> Optional[RecoveryExecutionResult]:
        """
        Main entry point invoked by webhook or approval handler.
        Evaluates safety policies and routes through execution mode handlers.
        """
        incident_id = decision.incident_id
        action = decision.recommended_action
        service = decision.service.lower()

        logger.info(
            "Evaluating recovery for incident=%s, service=%s, action=%s, alert_state=%s",
            incident_id,
            service,
            action,
            decision.alert_state,
        )

        # Safety Check 1: Action Allowlist
        if action not in settings.ALLOWED_RECOVERY_ACTIONS:
            logger.info("Action '%s' is not an executable recovery action (allowlist check passed as no-op).", action)
            return None

        # Safety Check 2: Alert must be firing, not resolved
        if decision.alert_state != "firing":
            logger.warning("Rejected recovery for non-firing alert state: '%s'", decision.alert_state)
            return self._record_skipped(incident_id, action, service, "SKIPPED_NOT_FIRING", "Alert is not in firing state.")

        # Safety Check 3: Forbidden Service Targets
        if service in settings.FORBIDDEN_SERVICES:
            msg = f"CRITICAL SECURITY VIOLATION: Automated recovery on forbidden service '{service}' rejected!"
            logger.critical(msg)
            return self._record_skipped(incident_id, action, service, "SKIPPED_FORBIDDEN_SERVICE", msg)

        # Safety Check 4: Service Allowlist
        if service not in settings.ALLOWED_SERVICES:
            msg = f"Rejected recovery: Service '{service}' is not in approved recovery allowlist."
            logger.warning(msg)
            return self._record_skipped(incident_id, action, service, "SKIPPED_UNAPPROVED_SERVICE", msg)

        # Safety Check 5: Confidence Threshold
        if decision.confidence < settings.HIGH_CONFIDENCE_THRESHOLD and not force_execute:
            msg = f"Rejected recovery: Confidence {decision.confidence:.2f} is below safety threshold {settings.HIGH_CONFIDENCE_THRESHOLD:.2f}."
            logger.warning(msg)
            return self._record_skipped(incident_id, action, service, "SKIPPED_LOW_CONFIDENCE", msg)

        # Safety Check 6: Maximum Attempts Per Incident Loop Protection
        attempt_count = incident_store.get_incident_attempts(incident_id)
        if attempt_count >= settings.MAX_RECOVERY_ATTEMPTS_PER_INCIDENT:
            msg = f"Recovery loop protection: Max attempts ({settings.MAX_RECOVERY_ATTEMPTS_PER_INCIDENT}) exceeded for incident {incident_id}."
            logger.warning(msg)
            return self._record_skipped(incident_id, action, service, "SKIPPED_MAX_ATTEMPTS", msg)

        # Safety Check 7: Circuit Breaker
        cb_allowed, cb_state, cb_reason = circuit_breaker_manager.can_execute(service)
        if not cb_allowed:
            metrics_registry.set_gauge("autoheal_circuit_breaker_tripped", {"service": service}, 1.0)
            logger.critical("Circuit breaker blocked recovery for '%s': %s", service, cb_reason)
            return self._record_skipped(incident_id, action, service, "SKIPPED_CIRCUIT_BREAKER", cb_reason)

        # Safety Check 8: Service Cooldown
        in_cooldown, remaining_seconds, cooldown_until = cooldown_manager.is_in_cooldown(service)
        if in_cooldown and not force_execute:
            metrics_registry.inc_counter("autoheal_cooldown_skips_total", {"service": service})
            msg = f"Service '{service}' is in active cooldown ({remaining_seconds:.1f}s remaining until {cooldown_until})."
            logger.info(msg)
            return self._record_skipped(incident_id, action, service, "SKIPPED_COOLDOWN", msg)

        # Safety Check 9: Concurrent Execution Prevention
        with self._execution_lock:
            if service in self._active_executions or incident_id in self._active_executions:
                msg = f"Concurrent recovery already in progress for service '{service}' or incident '{incident_id}'."
                logger.warning(msg)
                return self._record_skipped(incident_id, action, service, "SKIPPED_CONCURRENT_EXECUTION", msg)
            self._active_executions.add(service)
            self._active_executions.add(incident_id)

        try:
            # Mode Routing
            mode = settings.EXECUTION_MODE.upper()

            # MODE B: APPROVAL_REQUIRED
            if mode == "APPROVAL_REQUIRED" and not force_execute:
                incident_store.set_approval_status(
                    incident_id=incident_id,
                    approval_status="pending",
                    recovery_status="PENDING_APPROVAL",
                )
                metrics_registry.inc_counter("autoheal_pending_approvals", {"service": service})
                logger.info("Incident %s marked PENDING_APPROVAL under APPROVAL_REQUIRED mode.", incident_id)
                now_iso = datetime.now(timezone.utc).isoformat()
                return RecoveryExecutionResult(
                    incident_id=incident_id,
                    action=action,
                    service=service,
                    status="PENDING_APPROVAL",
                    execution_mode="APPROVAL_REQUIRED",
                    dry_run=True,
                    start_time=now_iso,
                    end_time=now_iso,
                    duration_seconds=0.0,
                    health_verified=False,
                    message="Recovery request pending manual operator approval.",
                )

            # Determine Dry-Run setting
            # Default is DRY_RUN=True. AUTO_RECOVERY requires multi-layer explicit flags.
            is_dry_run = True
            if mode == "AUTO_RECOVERY" and settings.ENABLE_AUTO_RECOVERY and force_execute:
                is_dry_run = False
            else:
                is_dry_run = True # Dry-run strictly enforced for Phase 8

            # Execute recovery via Ansible runner
            return self._execute_ansible_runner(
                incident_id=incident_id,
                action=action,
                service=service,
                dry_run=is_dry_run,
                attempt_number=attempt_count + 1,
            )

        finally:
            with self._execution_lock:
                self._active_executions.discard(service)
                self._active_executions.discard(incident_id)

    def _execute_ansible_runner(
        self,
        incident_id: str,
        action: str,
        service: str,
        dry_run: bool,
        attempt_number: int,
    ) -> RecoveryExecutionResult:
        """
        Executes the containerized Ansible runner with safe argument lists.
        Never uses shell=True. Strictly validates parameters against fixed server-side mappings.
        """
        start_time_dt = datetime.now(timezone.utc)
        start_time_iso = start_time_dt.isoformat()
        mode_str = "DRY_RUN" if dry_run else "AUTO_RECOVERY"

        metrics_registry.inc_counter(
            "autoheal_recovery_attempts_total",
            {"service": service, "action": action, "mode": mode_str},
        )

        # Validate incident_id format
        safe_incident_id = incident_id if UUID_REGEX.match(incident_id) else "safe-incident-id"

        # Fixed, hardcoded command arguments (No user-provided shell variables)
        cmd = [
            settings.DOCKER_BIN,
            "run",
            "--rm",
            "--network", settings.DOCKER_NETWORK,
            "-v", f"{settings.DOCKER_SOCK}:{settings.DOCKER_SOCK}",
            settings.ANSIBLE_RUNNER_IMAGE,
            "python", "scripts/run_recovery.py",
            action,
            "--request-id", safe_incident_id,
            "--source", "autoheal_engine",
        ]

        if not dry_run:
            cmd.append("--execute")

        logger.info("Invoking Ansible runner: %s (dry_run=%s)", " ".join(cmd), dry_run)

        exit_code = 1
        output_text = ""
        status = "FAILED"
        health_verified = False

        try:
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=settings.EXECUTION_TIMEOUT_SECONDS,
                check=False,
            )
            exit_code = process.returncode
            output_text = (process.stdout or "") + "\n" + (process.stderr or "")

            if exit_code == 0:
                status = "SIMULATED" if dry_run else "SUCCESS"
                logger.info("Ansible runner completed successfully (exit_code=0)")
            else:
                status = "FAILED"
                logger.error("Ansible runner exited with non-zero code %d", exit_code)

        except subprocess.TimeoutExpired as tex:
            status = "TIMEOUT"
            exit_code = 124
            output_text = f"Execution timed out after {settings.EXECUTION_TIMEOUT_SECONDS}s: {tex}"
            logger.error(output_text)

        except FileNotFoundError as fnf:
            status = "FAILED"
            exit_code = 127
            output_text = f"Docker binary '{settings.DOCKER_BIN}' not found: {fnf}"
            logger.error(output_text)

        except Exception as ex:
            status = "FAILED"
            exit_code = 1
            output_text = f"Subprocess execution error: {ex}"
            logger.exception(output_text)

        end_time_dt = datetime.now(timezone.utc)
        duration_seconds = round((end_time_dt - start_time_dt).total_seconds(), 2)

        # Post-execution Health Verification
        health_verified = self.verify_service_health(service)

        # Apply Cooldown upon execution
        cooldown_until = cooldown_manager.apply_cooldown(service, action)

        # Update Circuit Breaker & Metrics
        cb_info = circuit_breaker_manager.get_status(service)
        if status in ("SUCCESS", "SIMULATED") and health_verified:
            circuit_breaker_manager.record_success(service)
            if dry_run:
                metrics_registry.inc_counter("autoheal_recovery_simulated_total", {"service": service, "action": action})
            else:
                metrics_registry.inc_counter("autoheal_recovery_success_total", {"service": service, "action": action})
        else:
            circuit_breaker_manager.record_failure(service, reason=output_text[-200:])
            metrics_registry.inc_counter("autoheal_recovery_failure_total", {"service": service, "action": action})

        metrics_registry.set_gauge(
            "autoheal_recovery_duration_seconds",
            {"service": service, "action": action},
            duration_seconds,
        )

        result = RecoveryExecutionResult(
            incident_id=incident_id,
            action=action,
            service=service,
            status=status,
            execution_mode=mode_str,
            dry_run=dry_run,
            start_time=start_time_iso,
            end_time=end_time_dt.isoformat(),
            duration_seconds=duration_seconds,
            exit_code=exit_code,
            ansible_output=output_text[-2000:],
            health_verified=health_verified,
            message=f"Ansible {mode_str} recovery executed. Status: {status}. Health: {'HEALTHY' if health_verified else 'UNVERIFIED'}.",
        )

        # Update persistent incident record in SQLite
        incident_store.update_recovery_execution(
            incident_id=incident_id,
            result=result,
            attempt_number=attempt_number,
            circuit_breaker_state=cb_info.state,
            cooldown_state=f"active until {cooldown_until}",
        )

        return result

    def verify_service_health(self, service: str) -> bool:
        """
        Direct health probe validating that the service is operational.
        Supports internal Docker network resolution and host port fallbacks.
        """
        try:
            if service == "backend":
                urls = ["http://backend:8000/api/core/health/", "http://localhost:8000/api/core/health/"]
                for url in urls:
                    try:
                        req = urllib.request.Request(url, headers={"User-Agent": "AutoHeal-Engine"})
                        with urllib.request.urlopen(req, timeout=3) as resp:
                            if resp.status == 200:
                                return True
                    except Exception:
                        continue
                return False

            elif service == "frontend":
                urls = ["http://frontend:3000/api/health", "http://localhost:6060/api/health"]
                for url in urls:
                    try:
                        req = urllib.request.Request(url, headers={"User-Agent": "AutoHeal-Engine"})
                        with urllib.request.urlopen(req, timeout=3) as resp:
                            if resp.status == 200:
                                return True
                    except Exception:
                        continue
                return False

            elif service == "redis":
                hosts = [("redis", 6379), ("localhost", 6379)]
                for host, port in hosts:
                    try:
                        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        sock.settimeout(2.0)
                        result = sock.connect_ex((host, port))
                        sock.close()
                        if result == 0:
                            return True
                    except Exception:
                        continue
                return False

            return True

        except Exception as ex:
            logger.error("Health verification exception for '%s': %s", service, ex)
            return False

    def _record_skipped(
        self,
        incident_id: str,
        action: str,
        service: str,
        status: str,
        reason: str,
    ) -> RecoveryExecutionResult:
        now_iso = datetime.now(timezone.utc).isoformat()
        result = RecoveryExecutionResult(
            incident_id=incident_id,
            action=action,
            service=service,
            status=status,
            execution_mode=settings.EXECUTION_MODE.upper(),
            dry_run=True,
            start_time=now_iso,
            end_time=now_iso,
            duration_seconds=0.0,
            exit_code=0,
            ansible_output="",
            health_verified=False,
            message=reason,
        )
        incident_store.update_recovery_execution(
            incident_id=incident_id,
            result=result,
            failure_reason=reason,
        )
        return result

recovery_executor = RecoveryExecutor()