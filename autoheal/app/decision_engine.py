import uuid
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.models import AlertmanagerAlert, IncidentClassification, HealingDecision
from app.logging_config import logger

class DecisionEngine:
    """Rule-based decision engine for determining automated recovery recommendations."""

    @staticmethod
    def decide(classification: IncidentClassification, alert: AlertmanagerAlert) -> HealingDecision:
        incident_id = str(uuid.uuid4())
        alert_state = alert.status.lower()
        now = datetime.now(timezone.utc)
        cooldown_delta = timedelta(seconds=settings.COOLDOWN_SECONDS)
        can_execute_after = (now + cooldown_delta).isoformat()
        
        # Calculate fingerprint
        fingerprint = alert.fingerprint or f"{classification.alert_name}:{classification.service}"
        
        # Safety Check 1: Resolved alert -> No recovery action
        if alert_state == "resolved":
            decision = HealingDecision(
                incident_id=incident_id,
                fingerprint=fingerprint,
                alert_name=classification.alert_name,
                service=classification.service,
                severity=classification.severity,
                category=classification.category,
                alert_state="resolved",
                recommended_action="no_action",
                reason=f"Alert {classification.alert_name} is resolved; no recovery action required.",
                confidence=1.0,
                execution_mode="dry_run" if settings.DRY_RUN else settings.EXECUTION_MODE.lower(),
                cooldown_seconds=0,
                can_execute_after=now.isoformat(),
                timestamp=now.isoformat(),
            )
            logger.info("Alert %s is resolved -> recommended action: no_action", classification.alert_name)
            return decision

        # Safety Check 2: Unknown alert -> Manual investigation
        if not classification.is_known:
            decision = HealingDecision(
                incident_id=incident_id,
                fingerprint=fingerprint,
                alert_name=classification.alert_name,
                service=classification.service,
                severity=classification.severity,
                category=classification.category,
                alert_state="firing",
                recommended_action="manual_investigation",
                reason=f"Unrecognized alert '{classification.alert_name}'; routing for manual operator analysis.",
                confidence=0.5,
                execution_mode="dry_run" if settings.DRY_RUN else settings.EXECUTION_MODE.lower(),
                cooldown_seconds=settings.COOLDOWN_SECONDS,
                can_execute_after=can_execute_after,
                timestamp=now.isoformat(),
            )
            logger.warning("Unknown alert %s -> recommended action: manual_investigation", classification.alert_name)
            return decision

        # Safety Check 3: Known firing alerts mapping
        recommended_action = "manual_investigation"
        reason = "Alert triggered; evaluation required."
        confidence = 0.80

        if classification.alert_name == "BackendUnavailable":
            recommended_action = "restart_backend"
            reason = "Backend HTTP health check failed continuously for >30s. Recommend restarting Daphne ASGI container."
            confidence = 0.95

        elif classification.alert_name == "FrontendUnavailable":
            recommended_action = "restart_frontend"
            reason = "Frontend Next.js probe failed continuously for >30s. Recommend restarting Next.js web application container."
            confidence = 0.95

        elif classification.alert_name in ("RedisDown", "RedisUnavailable"):
            recommended_action = "restart_redis"
            reason = "Redis service probe failed. Recommend restarting MovieFlow Redis cache & channels container."
            confidence = 0.95

        elif classification.alert_name in ("MonitoringStackDown", "MonitoringTargetDown"):
            recommended_action = "investigate_monitoring"
            reason = f"Monitoring infrastructure alert ({classification.alert_name}). Recommend verifying scrape target connectivity and exporter logs on movieflow_net."
            confidence = 0.90

        elif classification.alert_name in ("HighHostCPUUsage", "LowHostMemory", "ContainerHighMemoryUsage"):
            recommended_action = "investigate_resource_usage"
            reason = f"Resource saturation threshold exceeded ({classification.alert_name}). Recommend inspecting container footprints via docker stats."
            confidence = 0.85

        # Strict action allowlist validation
        if recommended_action not in settings.ALLOWED_ACTIONS:
            logger.error("Action %s not in ALLOWED_ACTIONS! Forcing manual_investigation.", recommended_action)
            recommended_action = "manual_investigation"
            reason = "Security check: Action not permitted in allowlist."
            confidence = 0.1

        decision = HealingDecision(
            incident_id=incident_id,
            fingerprint=fingerprint,
            alert_name=classification.alert_name,
            service=classification.service,
            severity=classification.severity,
            category=classification.category,
            alert_state="firing",
            recommended_action=recommended_action,
            reason=reason,
            confidence=confidence,
            execution_mode="dry_run" if settings.DRY_RUN else settings.EXECUTION_MODE.lower(),
            cooldown_seconds=settings.COOLDOWN_SECONDS,
            can_execute_after=can_execute_after,
            timestamp=now.isoformat(),
        )

        logger.info(
            "Incident %s: alert=%s service=%s action=%s (mode=%s confidence=%.2f)",
            incident_id,
            classification.alert_name,
            classification.service,
            recommended_action,
            decision.execution_mode,
            confidence,
        )
        return decision

decision_engine = DecisionEngine()
