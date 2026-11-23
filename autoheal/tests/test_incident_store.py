import os
import tempfile
import pytest
from app.models import AlertmanagerAlert
from app.classifier import classifier
from app.decision_engine import decision_engine
from app.incident_store import IncidentStore

@pytest.fixture
def temp_store():
    fd, temp_db = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    store = IncidentStore(db_path=temp_db)
    yield store
    if os.path.exists(temp_db):
        try:
            os.remove(temp_db)
        except OSError:
            pass

def test_record_and_get_incident(temp_store):
    alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "BackendUnavailable", "severity": "critical"},
        fingerprint="fp-backend-123",
    )
    cls = classifier.classify(alert)
    decision = decision_engine.decide(cls, alert)

    rec = temp_store.record_incident(decision, alert)
    assert rec.incident_id == decision.incident_id
    assert rec.alert_name == "BackendUnavailable"
    assert rec.service == "backend"
    assert rec.status == "firing"
    assert rec.recommended_action == "restart_backend"

    fetched = temp_store.get_incident(decision.incident_id)
    assert fetched is not None
    assert fetched.incident_id == decision.incident_id

def test_duplicate_detection(temp_store):
    alert1 = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "FrontendUnavailable", "severity": "critical"},
        fingerprint="fp-frontend-dup",
    )
    cls1 = classifier.classify(alert1)
    dec1 = decision_engine.decide(cls1, alert1)
    rec1 = temp_store.record_incident(dec1, alert1)

    # Send duplicate alert with same fingerprint
    alert2 = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "FrontendUnavailable", "severity": "critical"},
        fingerprint="fp-frontend-dup",
    )
    cls2 = classifier.classify(alert2)
    dec2 = decision_engine.decide(cls2, alert2)
    rec2 = temp_store.record_incident(dec2, alert2)

    # Should reuse existing active incident
    assert rec1.incident_id == rec2.incident_id
    stats = temp_store.get_stats()
    assert stats["total"] == 1

def test_resolve_incident_updates_record(temp_store):
    firing_alert = AlertmanagerAlert(
        status="firing",
        labels={"alertname": "BackendUnavailable", "severity": "critical"},
        fingerprint="fp-backend-resolve-test",
    )
    cls_f = classifier.classify(firing_alert)
    dec_f = decision_engine.decide(cls_f, firing_alert)
    rec_f = temp_store.record_incident(dec_f, firing_alert)
    assert rec_f.status == "firing"

    # Send resolved alert
    resolved_alert = AlertmanagerAlert(
        status="resolved",
        labels={"alertname": "BackendUnavailable", "severity": "critical"},
        fingerprint="fp-backend-resolve-test",
    )
    cls_r = classifier.classify(resolved_alert)
    dec_r = decision_engine.decide(cls_r, resolved_alert)
    rec_r = temp_store.record_incident(dec_r, resolved_alert)

    assert rec_r.incident_id == rec_f.incident_id
    assert rec_r.status == "resolved"
    assert rec_r.resolution_time is not None

def test_list_incidents_filtering(temp_store):
    # Insert multiple incidents
    for name, srv in [("BackendUnavailable", "backend"), ("FrontendUnavailable", "frontend")]:
        alert = AlertmanagerAlert(
            status="firing",
            labels={"alertname": name, "severity": "critical"},
            fingerprint=f"fp-{name}",
        )
        cls = classifier.classify(alert)
        dec = decision_engine.decide(cls, alert)
        temp_store.record_incident(dec, alert)

    all_incs = temp_store.list_incidents()
    assert len(all_incs) == 2

    backend_incs = temp_store.list_incidents(service="backend")
    assert len(backend_incs) == 1
    assert backend_incs[0].service == "backend"
