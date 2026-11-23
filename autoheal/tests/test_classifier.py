import pytest
from app.models import AlertmanagerAlert
from app.classifier import classifier

def test_classify_backend_unavailable():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "BackendUnavailable", "severity": "critical"},
    )
    res = classifier.classify(alert)
    assert res.alert_name == "BackendUnavailable"
    assert res.service == "backend"
    assert res.category == "availability"
    assert res.severity == "critical"
    assert res.is_known is True

def test_classify_frontend_unavailable():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "FrontendUnavailable", "severity": "critical"},
    )
    res = classifier.classify(alert)
    assert res.alert_name == "FrontendUnavailable"
    assert res.service == "frontend"
    assert res.category == "availability"
    assert res.is_known is True

def test_classify_monitoring_stack_down():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "MonitoringStackDown", "severity": "critical"},
    )
    res = classifier.classify(alert)
    assert res.alert_name == "MonitoringStackDown"
    assert res.service == "monitoring"
    assert res.category == "availability"
    assert res.is_known is True

def test_classify_monitoring_target_down():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "MonitoringTargetDown", "severity": "warning"},
    )
    res = classifier.classify(alert)
    assert res.alert_name == "MonitoringTargetDown"
    assert res.service == "infrastructure"
    assert res.category == "target_health"
    assert res.is_known is True

def test_classify_high_host_cpu():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "HighHostCPUUsage", "severity": "warning"},
    )
    res = classifier.classify(alert)
    assert res.alert_name == "HighHostCPUUsage"
    assert res.service == "host"
    assert res.category == "resource"
    assert res.is_known is True

def test_classify_low_host_memory():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "LowHostMemory", "severity": "warning"},
    )
    res = classifier.classify(alert)
    assert res.alert_name == "LowHostMemory"
    assert res.service == "host"
    assert res.category == "resource"
    assert res.is_known is True

def test_classify_container_high_memory():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "ContainerHighMemoryUsage", "severity": "warning"},
    )
    res = classifier.classify(alert)
    assert res.alert_name == "ContainerHighMemoryUsage"
    assert res.service == "container"
    assert res.category == "resource"
    assert res.is_known is True

def test_classify_unknown_alert():
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "RandomUnregisteredAlert", "severity": "info"},
    )
    res = classifier.classify(alert)
    assert res.alert_name == "RandomUnregisteredAlert"
    assert res.service == "unknown"
    assert res.category == "manual_investigation"
    assert res.is_known is False
