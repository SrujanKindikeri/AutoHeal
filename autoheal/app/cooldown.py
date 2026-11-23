from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional, List
from app.config import settings
from app.incident_store import incident_store
from app.models import CooldownServiceInfo
from app.logging_config import logger

class CooldownManager:
    """Manages persistent service recovery cooldowns across container restarts."""

    def __init__(self, default_cooldown_seconds: Optional[int] = None):
        self.default_cooldown_seconds = default_cooldown_seconds or settings.COOLDOWN_SECONDS

    def is_in_cooldown(self, service: str) -> Tuple[bool, float, Optional[str]]:
        """
        Checks whether a service is currently under an active recovery cooldown.
        Returns:
            (is_in_cooldown: bool, remaining_seconds: float, cooldown_until_iso: Optional[str])
        """
        record = incident_store.get_service_cooldown(service)
        if not record:
            return False, 0.0, None

        cooldown_until_str = record.get("cooldown_until")
        if not cooldown_until_str:
            return False, 0.0, None

        try:
            cooldown_until = datetime.fromisoformat(cooldown_until_str)
            now = datetime.now(timezone.utc)
            if cooldown_until > now:
                remaining = (cooldown_until - now).total_seconds()
                return True, round(remaining, 2), cooldown_until_str
            else:
                return False, 0.0, cooldown_until_str
        except Exception as ex:
            logger.error("Failed to parse cooldown timestamp '%s': %s", cooldown_until_str, ex)
            return False, 0.0, None

    def apply_cooldown(self, service: str, action: str, duration_seconds: Optional[int] = None) -> str:
        """Applies a cooldown window to a service and stores it in the persistent SQLite database."""
        duration = duration_seconds or self.default_cooldown_seconds
        now = datetime.now(timezone.utc)
        cooldown_until = (now + timedelta(seconds=duration)).isoformat()
        incident_store.update_service_cooldown(service, cooldown_until, action)
        logger.info("Applied %ds cooldown to service '%s' for action '%s' until %s", duration, service, action, cooldown_until)
        return cooldown_until

    def get_service_status(self, service: str) -> CooldownServiceInfo:
        in_cooldown, remaining, until_str = self.is_in_cooldown(service)
        record = incident_store.get_service_cooldown(service)
        return CooldownServiceInfo(
            service=service,
            is_in_cooldown=in_cooldown,
            remaining_seconds=remaining,
            cooldown_until=until_str,
            last_action=record.get("last_action") if record else None,
            last_recovery_time=record.get("last_recovery_time") if record else None,
        )

    def get_all_statuses(self) -> List[CooldownServiceInfo]:
        results = []
        for svc in sorted(list(settings.ALLOWED_SERVICES)):
            results.append(self.get_service_status(svc))
        return results

cooldown_manager = CooldownManager()