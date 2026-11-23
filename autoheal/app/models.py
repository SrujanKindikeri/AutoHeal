from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

class AlertmanagerAlert(BaseModel):
    status: str
    labels: Dict[str, str] = Field(default_factory=dict)
    annotations: Dict[str, str] = Field(default_factory=dict)
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None
    generatorURL: Optional[str] = None
    fingerprint: Optional[str] = None

class AlertmanagerWebhook(BaseModel):
    version: Optional[str] = "4"
    groupKey: Optional[str] = None
    status: str
    receiver: Optional[str] = None
    groupLabels: Dict[str, str] = Field(default_factory=dict)
    commonLabels: Dict[str, str] = Field(default_factory=dict)
    commonAnnotations: Dict[str, str] = Field(default_factory=dict)
    externalURL: Optional[str] = None
    alerts: List[AlertmanagerAlert] = Field(default_factory=list)

class IncidentClassification(BaseModel):
    alert_name: str
    service: str
    severity: str
    category: str
    is_known: bool

class HealingDecision(BaseModel):
    incident_id: str
    fingerprint: str
    alert_name: str
    service: str
    severity: str
    category: str
    alert_state: str
    recommended_action: str
    reason: str
    confidence: float
    execution_mode: str
    cooldown_seconds: int
    can_execute_after: Optional[str] = None
    timestamp: str

class IncidentRecord(BaseModel):
    incident_id: str
    fingerprint: str
    alert_name: str
    service: str
    severity: str
    category: str
    status: str
    received_time: str
    resolution_time: Optional[str] = None
    recommended_action: str
    reason: str
    confidence: float
    execution_mode: str
    cooldown_until: Optional[str] = None
    # Phase 8 extended recovery tracking fields
    approval_status: Optional[str] = "not_required"
    approval_time: Optional[str] = None
    approved_by: Optional[str] = None
    recovery_status: Optional[str] = "none"
    recovery_action: Optional[str] = None
    recovery_start_time: Optional[str] = None
    recovery_end_time: Optional[str] = None
    recovery_duration: Optional[float] = None
    ansible_exit_code: Optional[int] = None
    ansible_output_summary: Optional[str] = None
    health_verification_result: Optional[str] = None
    cooldown_state: Optional[str] = None
    attempt_number: Optional[int] = 0
    circuit_breaker_state: Optional[str] = "closed"
    failure_reason: Optional[str] = None

class RecoveryExecutionResult(BaseModel):
    incident_id: str
    action: str
    service: str
    status: str
    execution_mode: str
    dry_run: bool
    start_time: str
    end_time: str
    duration_seconds: float
    exit_code: Optional[int] = None
    ansible_output: Optional[str] = None
    health_verified: bool = False
    message: str

class ApprovalActionRequest(BaseModel):
    token: str
    approver: Optional[str] = "operator"
    reason: Optional[str] = "Manual operator approval"

class ApprovalActionResponse(BaseModel):
    status: str
    incident_id: str
    action: str
    service: str
    approval_status: str
    message: str
    timestamp: str

class CooldownServiceInfo(BaseModel):
    service: str
    is_in_cooldown: bool
    remaining_seconds: float
    cooldown_until: Optional[str] = None
    last_action: Optional[str] = None
    last_recovery_time: Optional[str] = None

class CooldownStatusResponse(BaseModel):
    cooldown_seconds: int
    services: List[CooldownServiceInfo]

class CircuitBreakerServiceInfo(BaseModel):
    service: str
    state: str
    consecutive_failures: int
    last_failure_time: Optional[str] = None
    tripped_time: Optional[str] = None

class RecoveryStatusResponse(BaseModel):
    execution_mode: str
    dry_run: bool
    auto_recovery_enabled: bool
    circuit_breakers: List[CircuitBreakerServiceInfo]
    cooldowns: List[CooldownServiceInfo]
    active_remedials: int
    pending_approvals: int
    total_recoveries_executed: int

class RecoveryHistoryRecord(BaseModel):
    id: int
    incident_id: str
    service: str
    action: str
    execution_mode: str
    status: str
    start_time: str
    end_time: str
    duration: float
    exit_code: Optional[int] = None
    details: Optional[str] = None
    output_snippet: Optional[str] = None

class WebhookResponse(BaseModel):
    status: str
    processed_count: int
    incidents: List[HealingDecision]
    recovery_results: Optional[List[RecoveryExecutionResult]] = Field(default_factory=list)

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    dry_run: bool
    database_connected: bool
    timestamp: str

class StatusResponse(BaseModel):
    status: str
    service: str
    mode: str
    dry_run: bool
    total_incidents: int
    firing_incidents: int
    resolved_incidents: int
    uptime_seconds: float
