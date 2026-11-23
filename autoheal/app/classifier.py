from app.models import AlertmanagerAlert, IncidentClassification

# Canonical incident classification mapping for MovieFlow AutoHeal alert rules
RULE_CLASSIFICATIONS = {
    "BackendUnavailable": {
        "service": "backend",
        "category": "availability",
        "is_known": True,
    },
    "FrontendUnavailable": {
        "service": "frontend",
        "category": "availability",
        "is_known": True,
    },
    "RedisDown": {
        "service": "redis",
        "category": "availability",
        "is_known": True,
    },
    "RedisUnavailable": {
        "service": "redis",
        "category": "availability",
        "is_known": True,
    },
    "MonitoringStackDown": {
        "service": "monitoring",
        "category": "availability",
        "is_known": True,
    },
    "MonitoringTargetDown": {
        "service": "infrastructure",
        "category": "target_health",
        "is_known": True,
    },
    "HighHostCPUUsage": {
        "service": "host",
        "category": "resource",
        "is_known": True,
    },
    "LowHostMemory": {
        "service": "host",
        "category": "resource",
        "is_known": True,
    },
    "ContainerHighMemoryUsage": {
        "service": "container",
        "category": "resource",
        "is_known": True,
    },
}

class IncidentClassifier:
    """Classifies incoming alerts into structured services and incident categories."""

    @staticmethod
    def classify(alert: AlertmanagerAlert) -> IncidentClassification:
        alert_name = alert.labels.get("alertname", "UnknownAlert")
        severity = alert.labels.get("severity", "unknown").lower()

        if alert_name in RULE_CLASSIFICATIONS:
            meta = RULE_CLASSIFICATIONS[alert_name]
            return IncidentClassification(
                alert_name=alert_name,
                service=meta["service"],
                severity=severity,
                category=meta["category"],
                is_known=True,
            )

        # Fallback for unknown or unrecognized alert rules
        return IncidentClassification(
            alert_name=alert_name,
            service=alert.labels.get("service", "unknown"),
            severity=severity,
            category="manual_investigation",
            is_known=False,
        )

classifier = IncidentClassifier()
