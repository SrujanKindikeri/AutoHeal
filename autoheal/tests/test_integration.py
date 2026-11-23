import os
import pytest
import subprocess
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.config import settings
from app.models import HealingDecision, AlertmanagerAlert
from app.recovery_executor import recovery_executor
from app.incident_store import incident_store
from app.cooldown import cooldown_manager
from app.circuit_breaker import circuit_breaker_manager
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_cooldowns_fixture():
    for svc in settings.ALLOWED_SERVICES:
        incident_store.update_service_cooldown(svc, "2020-01-01T00:00:00Z", "reset")
        circuit_breaker_manager.reset(svc)
    yield

def test_action_playbook_mapping():
    # Verify fixed server-side mappings
    mappings = settings.ACTION_PLAYBOOK_MAP
    assert mappings["restart_backend"]["playbook"] == "playbooks/recover_backend.yml"
    assert mappings["restart_frontend"]["playbook"] == "playbooks/recover_frontend.yml"
    assert mappings["restart_redis"]["playbook"] == "playbooks/recover_redis.yml"
    assert mappings["health_check"]["playbook"] == "playbooks/health_check.yml"

def test_unknown_action_rejected():
    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000001",
        fingerprint="test-fingerprint-1",
        alert_name="CustomUnknownAlert",
        service="backend",
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action="arbitrary_exploit",
        reason="Testing unknown action rejection",
        confidence=0.99,
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="test-fingerprint-1")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is None # Unapproved actions produce no execution result

def test_resolved_alert_rejected():
    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000002",
        fingerprint="test-fingerprint-2",
        alert_name="BackendUnavailable",
        service="backend",
        severity="critical",
        category="availability",
        alert_state="resolved",
        recommended_action="restart_backend",
        reason="Resolved alert",
        confidence=0.99,
        execution_mode="dry_run",
        cooldown_seconds=0,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="resolved", fingerprint="test-fingerprint-2")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is not None
    assert res.status == "SKIPPED_NOT_FIRING"

def test_low_confidence_rejected():
    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000003",
        fingerprint="test-fingerprint-3",
        alert_name="BackendUnavailable",
        service="backend",
        severity="warning",
        category="availability",
        alert_state="firing",
        recommended_action="restart_backend",
        reason="Low confidence alert",
        confidence=0.75, # Below 0.90 threshold
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="test-fingerprint-3")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is not None
    assert res.status == "SKIPPED_LOW_CONFIDENCE"

def test_cooldown_enforcement_and_persistence():
    service = "backend"
    action = "restart_backend"
    
    # Apply cooldown
    until = cooldown_manager.apply_cooldown(service, action, duration_seconds=120)
    in_cooldown, remaining, until_res = cooldown_manager.is_in_cooldown(service)
    assert in_cooldown is True
    assert remaining > 100
    assert until_res == until

    # Verify recovery executor respects cooldown
    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000004",
        fingerprint="test-fingerprint-4",
        alert_name="BackendUnavailable",
        service=service,
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action=action,
        reason="Testing cooldown skip",
        confidence=0.95,
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="test-fingerprint-4")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is not None
    assert res.status == "SKIPPED_COOLDOWN"

    # Reset cooldown for subsequent tests
    incident_store.update_service_cooldown(service, "2020-01-01T00:00:00Z", action)
    in_cd_now, _, _ = cooldown_manager.is_in_cooldown(service)
    assert in_cd_now is False

def test_circuit_breaker_tripping_and_reset():
    service = "redis"

    # Reset circuit breaker
    circuit_breaker_manager.reset(service)
    allowed, state, _ = circuit_breaker_manager.can_execute(service)
    assert allowed is True
    assert state == "closed"

    # Record 3 failures to trip
    circuit_breaker_manager.record_failure(service, "Error 1")
    circuit_breaker_manager.record_failure(service, "Error 2")
    circuit_breaker_manager.record_failure(service, "Error 3")

    allowed, state, reason = circuit_breaker_manager.can_execute(service)
    assert allowed is False
    assert state == "open"
    assert "CIRCUIT BREAKER" in reason.upper()

    # Reset and confirm closed
    circuit_breaker_manager.record_success(service)
    allowed, state, _ = circuit_breaker_manager.can_execute(service)
    assert allowed is True
    assert state == "closed"

def test_timeout_handling(monkeypatch):
    def mock_run_timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd=["docker"], timeout=60)

    monkeypatch.setattr(subprocess, "run", mock_run_timeout)
    monkeypatch.setattr(recovery_executor, "verify_service_health", lambda svc: True)

    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000005",
        fingerprint="test-fingerprint-5",
        alert_name="BackendUnavailable",
        service="backend",
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action="restart_backend",
        reason="Testing timeout handling",
        confidence=0.95,
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="test-fingerprint-5")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is not None
    assert res.status == "TIMEOUT"
    assert res.exit_code == 124

def test_missing_runner_image_handled(monkeypatch):
    mock_process = MagicMock()
    mock_process.returncode = 125
    mock_process.stdout = ""
    mock_process.stderr = "Unable to find image 'movieflow-ansible-runner:missing' locally"

    monkeypatch.setattr(subprocess, "run", lambda *args, **kwargs: mock_process)
    monkeypatch.setattr(recovery_executor, "verify_service_health", lambda svc: False)

    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000006",
        fingerprint="test-fingerprint-6",
        alert_name="FrontendUnavailable",
        service="frontend",
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action="restart_frontend",
        reason="Testing missing runner image handling",
        confidence=0.95,
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="test-fingerprint-6")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is not None
    assert res.status == "FAILED"
    assert res.exit_code == 125

def test_dry_run_execution_simulated(monkeypatch):
    # Clear cooldown for service before test
    incident_store.update_service_cooldown("backend", "2020-01-01T00:00:00Z", "restart_backend")

    mock_process = MagicMock()
    mock_process.returncode = 0
    mock_process.stdout = '{"status": "SUCCESS", "health_verified": true}'
    mock_process.stderr = ""

    monkeypatch.setattr(subprocess, "run", lambda *args, **kwargs: mock_process)
    monkeypatch.setattr(recovery_executor, "verify_service_health", lambda svc: True)

    decision = HealingDecision(
        incident_id="00000000-0000-0000-0000-000000000007",
        fingerprint="test-fingerprint-7",
        alert_name="BackendUnavailable",
        service="backend",
        severity="critical",
        category="availability",
        alert_state="firing",
        recommended_action="restart_backend",
        reason="Testing dry-run simulated execution",
        confidence=0.95,
        execution_mode="dry_run",
        cooldown_seconds=300,
        timestamp="2026-11-23T00:00:00Z"
    )
    alert = AlertmanagerAlert(status="firing", fingerprint="test-fingerprint-7")

    res = recovery_executor.handle_decision(decision, alert)
    assert res is not None
    assert res.status == "SIMULATED"
    assert res.dry_run is True
    assert res.health_verified is True

def test_recovery_api_endpoints():
    # 1. GET /recovery/status
    res = client.get("/recovery/status")
    assert res.status_code == 200
    data = res.json()
    assert "execution_mode" in data
    assert "circuit_breakers" in data
    assert "cooldowns" in data

    # 2. GET /recovery/cooldowns
    res = client.get("/recovery/cooldowns")
    assert res.status_code == 200
    data = res.json()
    assert len(data["services"]) >= 3

    # 3. GET /recovery/history
    res = client.get("/recovery/history")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    # 4. GET /metrics
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "autoheal_recovery_attempts_total" in res.text
    assert "autoheal_circuit_breaker_tripped" in res.text
