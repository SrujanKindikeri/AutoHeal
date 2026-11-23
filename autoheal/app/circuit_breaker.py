from datetime import datetime, timezone, timedelta
from typing import Tuple, Dict, Any, List
from app.config import settings
from app.incident_store import incident_store
from app.models import CircuitBreakerServiceInfo
from app.logging_config import logger

class CircuitBreakerManager:
    """
    Protects services from repeated failing recovery loops.
    States:
      - closed: Normal state, recoveries permitted.
      - open: Consecutive failure limit reached; recoveries blocked; manual intervention required.
      - half_open: Reset window elapsed; testing one recovery attempt.
    """

    def __init__(
        self,
        max_failures: int = settings.CIRCUIT_BREAKER_MAX_FAILURES,
        reset_seconds: int = settings.CIRCUIT_BREAKER_RESET_SECONDS,
    ):
        self.max_failures = max_failures
        self.reset_seconds = reset_seconds

    def can_execute(self, service: str) -> Tuple[bool, str, str]:
        """
        Determines if recovery execution is permitted by the circuit breaker.
        Returns:
            (can_execute: bool, state: str, reason: str)
        """
        data = incident_store.get_circuit_breaker(service)
        state = data.get("state", "closed")
        failures = data.get("consecutive_failures", 0)
        tripped_time_str = data.get("tripped_time")

        if state == "open":
            if tripped_time_str:
                try:
                    tripped_time = datetime.fromisoformat(tripped_time_str)
                    now = datetime.now(timezone.utc)
                    if (now - tripped_time).total_seconds() > self.reset_seconds:
                        # Transition to half_open for a probationary test recovery
                        logger.info("Circuit breaker for '%s' reset timer expired. Transitioning to half_open.", service)
                        incident_store.update_circuit_breaker(
                            service=service,
                            state="half_open",
                            consecutive_failures=failures,
                            last_failure_time=data.get("last_failure_time"),
                            tripped_time=tripped_time_str,
                        )
                        return True, "half_open", "Probationary test recovery allowed in half_open state."
                except Exception as ex:
                    logger.error("Error evaluating circuit breaker reset for '%s': %s", service, ex)

            return (
                False,
                "open",
                f"Circuit breaker is OPEN for service '{service}' ({failures} consecutive failures). Automated recovery halted; manual intervention required.",
            )

        return True, state, "Circuit breaker allows execution."

    def record_success(self, service: str):
        """Resets the circuit breaker upon successful recovery and health verification."""
        incident_store.update_circuit_breaker(
            service=service,
            state="closed",
            consecutive_failures=0,
            last_failure_time=None,
            tripped_time=None,
        )
        logger.info("Circuit breaker reset to CLOSED for service '%s'", service)

    def record_failure(self, service: str, reason: str = ""):
        """Records a recovery failure, tripping the breaker if threshold is reached."""
        data = incident_store.get_circuit_breaker(service)
        current_failures = data.get("consecutive_failures", 0) + 1
        now_iso = datetime.now(timezone.utc).isoformat()

        if current_failures >= self.max_failures:
            state = "open"
            tripped_time = now_iso
            logger.critical(
                "CIRCUIT BREAKER TRIPPED for service '%s'! %d consecutive failures reached. Halting auto-recovery. Reason: %s",
                service,
                current_failures,
                reason,
            )
        else:
            state = data.get("state", "closed")
            tripped_time = data.get("tripped_time")
            logger.warning(
                "Recorded recovery failure for service '%s' (%d/%d consecutive failures).",
                service,
                current_failures,
                self.max_failures,
            )

        incident_store.update_circuit_breaker(
            service=service,
            state=state,
            consecutive_failures=current_failures,
            last_failure_time=now_iso,
            tripped_time=tripped_time,
        )

    def reset(self, service: str):
        """Forces manual reset of circuit breaker."""
        self.record_success(service)

    def get_status(self, service: str) -> CircuitBreakerServiceInfo:
        data = incident_store.get_circuit_breaker(service)
        return CircuitBreakerServiceInfo(
            service=service,
            state=data.get("state", "closed"),
            consecutive_failures=data.get("consecutive_failures", 0),
            last_failure_time=data.get("last_failure_time"),
            tripped_time=data.get("tripped_time"),
        )

    def get_all_statuses(self) -> List[CircuitBreakerServiceInfo]:
        results = []
        for svc in sorted(list(settings.ALLOWED_SERVICES)):
            results.append(self.get_status(svc))
        return results

circuit_breaker_manager = CircuitBreakerManager()