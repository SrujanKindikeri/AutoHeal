import pytest
from app.models import AlertmanagerAlert
from app.classifier import classifier
from app.decision_engine import decision_engine
from app.config import settings

def test_decision_backend_unavailable():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "BackendUnavailable", "severity": "critical"},
    )
    cls = classifier.classify(alert)
    decision = decision_engine.decide(cls, alert)
    assert decision.recommended_action == "restart_backend"
    assert decision.confidence == 0.95
    assert decision.alert_state == "firing"
    assert decision.execution_mode == "dry_run"
    assert decision.cooldown_seconds == settings.COOLDOWN_SECONDS

def test_decision_frontend_unavailable():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "FrontendUnavailable", "severity": "critical"},
    )
    cls = classifier.classify(alert)
    decision = decision_engine.decide(cls, alert)
    assert decision.recommended_action == "restart_frontend"
    assert decision.confidence == 0.95
    assert decision.alert_state == "firing"

def test_decision_monitoring_stack_down():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "MonitoringStackDown", "severity": "critical"},
    )
    cls = classifier.classify(alert)
    decision = decision_engine.decide(cls, alert)
    assert decision.recommended_action == "investigate_monitoring"
    assert decision.confidence == 0.90

def test_decision_resource_usage():
    for alertname in ["HighHostCPUUsage", "LowHostMemory", "ContainerHighMemoryUsage"]:
        alert = AlertmanagerAlert(
            status="firing",
            labels={"alertname": alertname, "severity": "warning"},
        )
        cls = classifier.classify(alert)
        decision = decision_engine.decide(cls, alert)
        assert decision.recommended_action == "investigate_resource_usage"
        assert decision.confidence == 0.85

def test_decision_resolved_alert_safety():
    alert = AlertmanagerAlert(
        status="resolved",
        labels={"alertname": "BackendUnavailable", "severity": "critical"},
    )
    cls = classifier.classify(alert)
    decision = decision_engine.decide(cls, alert)
    assert decision.recommended_action == "no_action"
    assert decision.confidence == 1.0
    assert decision.alert_state == "resolved"

def test_decision_unknown_alert_safety():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "UnknownDaemonPanic", "severity": "critical"},
    )
    cls = classifier.classify(alert)
    decision = decision_engine.decide(cls, alert)
    assert decision.recommended_action == "manual_investigation"
    assert decision.confidence == 0.50
