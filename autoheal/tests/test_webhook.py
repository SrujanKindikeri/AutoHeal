import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_webhook_single_firing_alert():
    payload = {
        "version": "4",
        "status": "firing",
        "receiver": "critical-receiver",
        "alerts": [
            {
                "status": "firing",
                "labels": {
                    "alertname": "BackendUnavailable",
                    "severity": "critical",
                    "service": "backend"
                },
                "annotations": {
                    "summary": "Backend probe failed"
                },
                "startsAt": "2026-11-23T00:00:00Z",
                "fingerprint": "webhook-test-single-1"
            }
        ]
    }
    response = client.post("/webhook/alerts", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["processed_count"] == 1
    incident = data["incidents"][0]
    assert incident["alert_name"] == "BackendUnavailable"
    assert incident["recommended_action"] == "restart_backend"
    assert incident["execution_mode"] == "dry_run"

def test_webhook_multiple_alerts():
    payload = {
        "version": "4",
        "status": "firing",
        "receiver": "default-receiver",
        "alerts": [
            {
                "status": "firing",
                "labels": {"alertname": "BackendUnavailable", "severity": "critical"},
                "fingerprint": "webhook-multi-1"
            },
            {
                "status": "firing",
                "labels": {"alertname": "FrontendUnavailable", "severity": "critical"},
                "fingerprint": "webhook-multi-2"
            },
            {
                "status": "firing",
                "labels": {"alertname": "HighHostCPUUsage", "severity": "warning"},
                "fingerprint": "webhook-multi-3"
            }
        ]
    }
    response = client.post("/webhook/alerts", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["processed_count"] == 3
    actions = [inc["recommended_action"] for inc in data["incidents"]]
    assert "restart_backend" in actions
    assert "restart_frontend" in actions
    assert "investigate_resource_usage" in actions

def test_webhook_invalid_payload_rejected():
    # Missing required 'status' field or invalid structure
    bad_payload = {"version": "4", "random_field": "no_status"}
    response = client.post("/webhook/alerts", json=bad_payload)
    assert response.status_code == 422

def test_health_and_status_endpoints():
    res_health = client.get("/health")
    assert res_health.status_code == 200
    health_data = res_health.json()
    assert health_data["status"] == "ok"
    assert health_data["service"] == "autoheal-engine"
    assert health_data["dry_run"] is True

    res_status = client.get("/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["status"] == "active"
    assert status_data["mode"] == "dry_run"
    assert status_data["total_incidents"] >= 0

def test_get_incidents_endpoints():
    res = client.get("/incidents")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    # 404 on nonexistent incident
    res_not_found = client.get("/incidents/nonexistent-id-00000")
    assert res_not_found.status_code == 404
