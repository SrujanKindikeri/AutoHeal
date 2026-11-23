from fastapi import APIRouter, HTTPException, status
from typing import List
from app.models import AlertmanagerWebhook, WebhookResponse, HealingDecision, RecoveryExecutionResult
from app.classifier import classifier
from app.decision_engine import decision_engine
from app.incident_store import incident_store
from app.recovery_executor import recovery_executor
from app.logging_config import logger

router = APIRouter(prefix="/webhook", tags=["Webhook"])

@router.post(
    "/alerts",
    response_model=WebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="Receive and process alerts from Prometheus Alertmanager",
)
async def receive_alerts(payload: AlertmanagerWebhook):
    """
    Receives Alertmanager webhook payload containing one or multiple alerts.
    Validates, classifies, generates safe recovery recommendations, stores incidents,
    and executes controlled recovery through Ansible (respecting DRY_RUN / APPROVAL modes).
    """
    if not payload.alerts:
        logger.warning("Received webhook payload with empty alerts list")
        return WebhookResponse(status="processed", processed_count=0, incidents=[], recovery_results=[])

    decisions: List[HealingDecision] = []
    recovery_results: List[RecoveryExecutionResult] = []

    for alert in payload.alerts:
        try:
            # 1. Classify incident
            classification = classifier.classify(alert)

            # 2. Determine healing recommendation
            decision = decision_engine.decide(classification, alert)

            # 3. Persist incident & update resolution status if resolved
            incident_store.record_incident(decision, alert)
            decisions.append(decision)

            # 4. Trigger recovery pipeline (respecting allowlist, cooldown, circuit breaker, execution mode)
            if decision.alert_state == "firing":
                rec_res = recovery_executor.handle_decision(decision, alert)
                if rec_res:
                    recovery_results.append(rec_res)

        except Exception as ex:
            logger.exception("Failed to process individual alert: %s", ex)
            # Continue processing subsequent alerts in batch

    logger.info(
        "Successfully processed %d alerts from Alertmanager (%d recovery actions evaluated)",
        len(decisions),
        len(recovery_results),
    )
    return WebhookResponse(
        status="processed",
        processed_count=len(decisions),
        incidents=decisions,
        recovery_results=recovery_results,
    )
