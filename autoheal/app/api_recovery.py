from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, status, Query

from app.config import settings
from app.models import (
    RecoveryStatusResponse,
    CooldownStatusResponse,
    RecoveryHistoryRecord,
    IncidentRecord,
    ApprovalActionRequest,
    ApprovalActionResponse,
    HealingDecision,
    AlertmanagerAlert,
)
from app.incident_store import incident_store
from app.cooldown import cooldown_manager
from app.circuit_breaker import circuit_breaker_manager
from app.recovery_executor import recovery_executor
from app.logging_config import logger

router = APIRouter(prefix="/recovery", tags=["Recovery Automation"])

def verify_approval_auth(header_token: Optional[str] = None, body_token: Optional[str] = None):
    """Secures approval endpoints using fixed API token."""
    provided = header_token or body_token
    if not provided or provided != settings.APPROVAL_TOKEN:
        logger.warning("Unauthorized recovery approval attempt rejected.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing AutoHeal authorization token.",
        )

@router.get(
    "/status",
    response_model=RecoveryStatusResponse,
    summary="Get recovery automation operational status, circuit breakers, and active cooldowns",
)
async def get_recovery_status():
    history = incident_store.get_recovery_history(limit=500)
    pending = incident_store.get_pending_approvals()

    return RecoveryStatusResponse(
        execution_mode=settings.EXECUTION_MODE,
        dry_run=settings.DRY_RUN,
        auto_recovery_enabled=settings.ENABLE_AUTO_RECOVERY,
        circuit_breakers=circuit_breaker_manager.get_all_statuses(),
        cooldowns=cooldown_manager.get_all_statuses(),
        active_remedials=len(recovery_executor._active_executions),
        pending_approvals=len(pending),
        total_recoveries_executed=len(history),
    )

@router.get(
    "/history",
    response_model=List[RecoveryHistoryRecord],
    summary="Get recent recovery execution history log",
)
async def get_recovery_history(limit: int = Query(50, ge=1, le=500)):
    return incident_store.get_recovery_history(limit=limit)

@router.get(
    "/cooldowns",
    response_model=CooldownStatusResponse,
    summary="Get active cooldown state and remaining countdowns for all services",
)
async def get_cooldowns():
    return CooldownStatusResponse(
        cooldown_seconds=settings.COOLDOWN_SECONDS,
        services=cooldown_manager.get_all_statuses(),
    )

@router.get(
    "/pending",
    response_model=List[IncidentRecord],
    summary="Get incidents currently awaiting operator approval",
)
async def get_pending_approvals():
    return incident_store.get_pending_approvals()

@router.post(
    "/approve/{incident_id}",
    response_model=ApprovalActionResponse,
    summary="Securely approve a pending recovery request (Requires Token)",
)
async def approve_recovery(
    incident_id: str,
    payload: Optional[ApprovalActionRequest] = None,
    x_autoheal_key: Optional[str] = Header(None, alias="X-AutoHeal-Key"),
):
    body_token = payload.token if payload else None
    verify_approval_auth(header_token=x_autoheal_key, body_token=body_token)

    incident = incident_store.get_incident(incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    if incident.approval_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incident '{incident_id}' is not in 'pending' approval state (current: '{incident.approval_status}').",
        )

    # Check for approval expiry
    try:
        rec_time = datetime.fromisoformat(incident.received_time)
        now = datetime.now(timezone.utc)
        if (now - rec_time).total_seconds() > settings.APPROVAL_EXPIRY_SECONDS:
            incident_store.set_approval_status(
                incident_id=incident_id,
                approval_status="expired",
                recovery_status="APPROVAL_EXPIRED",
            )
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=f"Approval request for incident '{incident_id}' has expired.",
            )
    except Exception as ex:
        logger.error("Error evaluating approval expiration: %s", ex)

    approver = payload.approver if payload else "operator"
    incident_store.set_approval_status(
        incident_id=incident_id,
        approval_status="approved",
        approved_by=approver,
        recovery_status="APPROVED_EXECUTING",
    )

    # Reconstruct decision strictly using recorded incident parameters (No caller manipulation)
    decision = HealingDecision(
        incident_id=incident.incident_id,
        fingerprint=incident.fingerprint,
        alert_name=incident.alert_name,
        service=incident.service,
        severity=incident.severity,
        category=incident.category,
        alert_state=incident.status,
        recommended_action=incident.recommended_action,
        reason=f"Approved by {approver}: {incident.reason}",
        confidence=incident.confidence,
        execution_mode=settings.EXECUTION_MODE.lower(),
        cooldown_seconds=settings.COOLDOWN_SECONDS,
        timestamp=incident.received_time,
    )
    alert = AlertmanagerAlert(
        status=incident.status,
        labels={"alertname": incident.alert_name, "service": incident.service},
        fingerprint=incident.fingerprint,
    )

    # Trigger execution
    result = recovery_executor.handle_decision(decision, alert, force_execute=True)

    now_iso = datetime.now(timezone.utc).isoformat()
    return ApprovalActionResponse(
        status="success",
        incident_id=incident_id,
        action=incident.recommended_action,
        service=incident.service,
        approval_status="approved",
        message=f"Recovery action '{incident.recommended_action}' approved and executed. Result: {result.status if result else 'COMPLETED'}.",
        timestamp=now_iso,
    )

@router.post(
    "/reject/{incident_id}",
    response_model=ApprovalActionResponse,
    summary="Securely reject a pending recovery request (Requires Token)",
)
async def reject_recovery(
    incident_id: str,
    payload: Optional[ApprovalActionRequest] = None,
    x_autoheal_key: Optional[str] = Header(None, alias="X-AutoHeal-Key"),
):
    body_token = payload.token if payload else None
    verify_approval_auth(header_token=x_autoheal_key, body_token=body_token)

    incident = incident_store.get_incident(incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    if incident.approval_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incident '{incident_id}' is not in 'pending' approval state.",
        )

    approver = payload.approver if payload else "operator"
    incident_store.set_approval_status(
        incident_id=incident_id,
        approval_status="rejected",
        approved_by=approver,
        recovery_status="REJECTED_BY_OPERATOR",
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    return ApprovalActionResponse(
        status="rejected",
        incident_id=incident_id,
        action=incident.recommended_action,
        service=incident.service,
        approval_status="rejected",
        message=f"Recovery request for incident '{incident_id}' rejected by {approver}.",
        timestamp=now_iso,
    )