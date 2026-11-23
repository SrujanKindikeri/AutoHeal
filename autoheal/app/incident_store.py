import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.config import settings
from app.models import (
    HealingDecision,
    AlertmanagerAlert,
    IncidentRecord,
    RecoveryExecutionResult,
    RecoveryHistoryRecord,
)
from app.logging_config import logger

MIGRATION_COLUMNS = [
    ("approval_status", "TEXT DEFAULT 'not_required'"),
    ("approval_time", "TEXT"),
    ("approved_by", "TEXT"),
    ("recovery_status", "TEXT DEFAULT 'none'"),
    ("recovery_action", "TEXT"),
    ("recovery_start_time", "TEXT"),
    ("recovery_end_time", "TEXT"),
    ("recovery_duration", "REAL"),
    ("ansible_exit_code", "INTEGER"),
    ("ansible_output_summary", "TEXT"),
    ("health_verification_result", "TEXT"),
    ("cooldown_state", "TEXT"),
    ("attempt_number", "INTEGER DEFAULT 0"),
    ("circuit_breaker_state", "TEXT DEFAULT 'closed'"),
    ("failure_reason", "TEXT"),
]

class IncidentStore:
    """Thread-safe SQLite persistent store for incident tracking and history."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.DATABASE_PATH
        self._ensure_db_dir()
        self.init_schema()

    def _ensure_db_dir(self):
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def init_schema(self):
        with self._get_connection() as conn:
            # 1. Core incidents table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    incident_id TEXT PRIMARY KEY,
                    fingerprint TEXT NOT NULL,
                    alert_name TEXT NOT NULL,
                    service TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    category TEXT NOT NULL,
                    status TEXT NOT NULL,
                    received_time TEXT NOT NULL,
                    resolution_time TEXT,
                    recommended_action TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    execution_mode TEXT NOT NULL,
                    cooldown_until TEXT,
                    raw_payload TEXT
                );
            """)

            # 2. Safe migrations for existing databases
            cursor = conn.execute("PRAGMA table_info(incidents);")
            existing_cols = {row["name"] for row in cursor.fetchall()}
            for col_name, col_def in MIGRATION_COLUMNS:
                if col_name not in existing_cols:
                    conn.execute(f"ALTER TABLE incidents ADD COLUMN {col_name} {col_def};")

            conn.execute("CREATE INDEX IF NOT EXISTS idx_incidents_fingerprint ON incidents (fingerprint);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents (service);")

            # 3. Persistent service cooldowns table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS service_cooldowns (
                    service TEXT PRIMARY KEY,
                    last_recovery_time TEXT NOT NULL,
                    cooldown_until TEXT NOT NULL,
                    last_action TEXT NOT NULL
                );
            """)

            # 4. Circuit breaker state table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS circuit_breakers (
                    service TEXT PRIMARY KEY,
                    state TEXT NOT NULL DEFAULT 'closed',
                    consecutive_failures INTEGER NOT NULL DEFAULT 0,
                    last_failure_time TEXT,
                    tripped_time TEXT
                );
            """)

            # 5. Recovery execution history audit log
            conn.execute("""
                CREATE TABLE IF NOT EXISTS recovery_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_id TEXT NOT NULL,
                    service TEXT NOT NULL,
                    action TEXT NOT NULL,
                    execution_mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    duration REAL NOT NULL,
                    exit_code INTEGER,
                    details TEXT,
                    output_snippet TEXT
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_recovery_history_incident ON recovery_history (incident_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_recovery_history_service ON recovery_history (service);")

        logger.info("Incident database schema initialized & migrated at %s", self.db_path)

    def record_incident(self, decision: HealingDecision, alert: AlertmanagerAlert) -> IncidentRecord:
        now_iso = datetime.now(timezone.utc).isoformat()
        raw_payload_str = json.dumps(alert.model_dump(), default=str)
        target_id = decision.incident_id

        with self._get_connection() as conn:
            # Handle RESOLVED alerts: update active incident if present
            if decision.alert_state == "resolved":
                cursor = conn.execute(
                    """
                    SELECT incident_id FROM incidents 
                    WHERE fingerprint = ? AND status = 'firing'
                    ORDER BY received_time DESC LIMIT 1
                    """,
                    (decision.fingerprint,),
                )
                row = cursor.fetchone()
                if row:
                    target_id = row["incident_id"]
                    conn.execute(
                        """
                        UPDATE incidents 
                        SET status = 'resolved', resolution_time = ?
                        WHERE incident_id = ?
                        """,
                        (now_iso, target_id),
                    )
                    conn.commit()
                    logger.info("Updated active incident %s to resolved", target_id)
                    return self._fetch_by_id(conn, target_id)
                else:
                    # If no active firing incident exists, record resolved incident directly
                    conn.execute(
                        """
                        INSERT INTO incidents (
                            incident_id, fingerprint, alert_name, service, severity,
                            category, status, received_time, resolution_time,
                            recommended_action, reason, confidence, execution_mode,
                            cooldown_until, raw_payload
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            decision.incident_id,
                            decision.fingerprint,
                            decision.alert_name,
                            decision.service,
                            decision.severity,
                            decision.category,
                            "resolved",
                            decision.timestamp,
                            now_iso,
                            decision.recommended_action,
                            decision.reason,
                            decision.confidence,
                            decision.execution_mode,
                            decision.can_execute_after,
                            raw_payload_str,
                        ),
                    )
                    conn.commit()
                    return self._fetch_by_id(conn, decision.incident_id)

            # Deduplication check for FIRING alerts:
            cursor = conn.execute(
                """
                SELECT incident_id, received_time FROM incidents
                WHERE fingerprint = ? AND status = 'firing'
                ORDER BY received_time DESC LIMIT 1
                """,
                (decision.fingerprint,),
            )
            existing = cursor.fetchone()
            if existing:
                logger.info(
                    "Duplicate alert detected for fingerprint %s (active incident: %s).",
                    decision.fingerprint,
                    existing["incident_id"],
                )
                return self._fetch_by_id(conn, existing["incident_id"])

            # Insert new incident record
            conn.execute(
                """
                INSERT INTO incidents (
                    incident_id, fingerprint, alert_name, service, severity,
                    category, status, received_time, resolution_time,
                    recommended_action, reason, confidence, execution_mode,
                    cooldown_until, raw_payload
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    decision.incident_id,
                    decision.fingerprint,
                    decision.alert_name,
                    decision.service,
                    decision.severity,
                    decision.category,
                    decision.alert_state,
                    decision.timestamp,
                    None,
                    decision.recommended_action,
                    decision.reason,
                    decision.confidence,
                    decision.execution_mode,
                    decision.can_execute_after,
                    raw_payload_str,
                ),
            )
            conn.commit()
            logger.info("Persisted incident %s (action=%s)", decision.incident_id, decision.recommended_action)
            return self._fetch_by_id(conn, decision.incident_id)

    def update_recovery_execution(
        self,
        incident_id: str,
        result: RecoveryExecutionResult,
        attempt_number: int = 1,
        circuit_breaker_state: str = "closed",
        cooldown_state: Optional[str] = None,
        failure_reason: Optional[str] = None,
    ):
        """Updates recovery execution outcome in the incident record."""
        health_verified_str = "HEALTHY" if result.health_verified else "UNVERIFIED"
        snippet = (result.ansible_output or "")[-500:]

        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE incidents
                SET recovery_status = ?,
                    recovery_action = ?,
                    recovery_start_time = ?,
                    recovery_end_time = ?,
                    recovery_duration = ?,
                    ansible_exit_code = ?,
                    ansible_output_summary = ?,
                    health_verification_result = ?,
                    cooldown_state = ?,
                    attempt_number = ?,
                    circuit_breaker_state = ?,
                    failure_reason = ?
                WHERE incident_id = ?
                """,
                (
                    result.status,
                    result.action,
                    result.start_time,
                    result.end_time,
                    result.duration_seconds,
                    result.exit_code,
                    snippet,
                    health_verified_str,
                    cooldown_state or "active",
                    attempt_number,
                    circuit_breaker_state,
                    failure_reason or ("" if result.status in ("SUCCESS", "SIMULATED") else result.message),
                    incident_id,
                ),
            )
            # Also log to recovery history audit table
            conn.execute(
                """
                INSERT INTO recovery_history (
                    incident_id, service, action, execution_mode, status,
                    start_time, end_time, duration, exit_code, details, output_snippet
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    incident_id,
                    result.service,
                    result.action,
                    result.execution_mode,
                    result.status,
                    result.start_time,
                    result.end_time,
                    result.duration_seconds,
                    result.exit_code,
                    result.message,
                    snippet,
                ),
            )
            conn.commit()
            logger.info("Updated recovery status for incident %s to %s", incident_id, result.status)

    def set_approval_status(
        self,
        incident_id: str,
        approval_status: str,
        approved_by: Optional[str] = None,
        recovery_status: Optional[str] = None,
    ):
        """Sets approval status (e.g. pending, approved, rejected)."""
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            query = "UPDATE incidents SET approval_status = ?, approval_time = ?, approved_by = ?"
            params = [approval_status, now_iso, approved_by or "system"]
            if recovery_status:
                query += ", recovery_status = ?"
                params.append(recovery_status)
            query += " WHERE incident_id = ?"
            params.append(incident_id)

            conn.execute(query, params)
            conn.commit()

    def get_incident_attempts(self, incident_id: str) -> int:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT attempt_number FROM incidents WHERE incident_id = ?", (incident_id,))
            row = cursor.fetchone()
            if row and row["attempt_number"]:
                return int(row["attempt_number"])
            return 0

    def _fetch_by_id(self, conn: sqlite3.Connection, incident_id: str) -> Optional[IncidentRecord]:
        cursor = conn.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return self._row_to_record(row)

    def get_incident(self, incident_id: str) -> Optional[IncidentRecord]:
        with self._get_connection() as conn:
            return self._fetch_by_id(conn, incident_id)

    def list_incidents(
        self,
        status: Optional[str] = None,
        service: Optional[str] = None,
        limit: int = 50,
    ) -> List[IncidentRecord]:
        query = "SELECT * FROM incidents WHERE 1=1"
        params: List[Any] = []
        if status:
            query += " AND status = ?"
            params.append(status.lower())
        if service:
            query += " AND service = ?"
            params.append(service.lower())
        query += " ORDER BY received_time DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            return [self._row_to_record(r) for r in rows]

    def get_pending_approvals(self) -> List[IncidentRecord]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM incidents
                WHERE approval_status = 'pending' AND status = 'firing'
                ORDER BY received_time DESC
                """
            )
            rows = cursor.fetchall()
            return [self._row_to_record(r) for r in rows]

    def _row_to_record(self, row: sqlite3.Row) -> IncidentRecord:
        data = dict(row)
        # Drop raw_payload from IncidentRecord model validation if present
        data.pop("raw_payload", None)
        return IncidentRecord(**data)

    # Cooldown persistence methods
    def get_service_cooldown(self, service: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM service_cooldowns WHERE service = ?",
                (service.lower(),),
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def update_service_cooldown(self, service: str, cooldown_until: str, last_action: str):
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO service_cooldowns (service, last_recovery_time, cooldown_until, last_action)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(service) DO UPDATE SET
                    last_recovery_time = excluded.last_recovery_time,
                    cooldown_until = excluded.cooldown_until,
                    last_action = excluded.last_action
                """,
                (service.lower(), now_iso, cooldown_until, last_action),
            )
            conn.commit()

    # Circuit breaker persistence methods
    def get_circuit_breaker(self, service: str) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM circuit_breakers WHERE service = ?",
                (service.lower(),),
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
            return {
                "service": service.lower(),
                "state": "closed",
                "consecutive_failures": 0,
                "last_failure_time": None,
                "tripped_time": None,
            }

    def update_circuit_breaker(
        self,
        service: str,
        state: str,
        consecutive_failures: int,
        last_failure_time: Optional[str] = None,
        tripped_time: Optional[str] = None,
    ):
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO circuit_breakers (service, state, consecutive_failures, last_failure_time, tripped_time)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(service) DO UPDATE SET
                    state = excluded.state,
                    consecutive_failures = excluded.consecutive_failures,
                    last_failure_time = excluded.last_failure_time,
                    tripped_time = excluded.tripped_time
                """,
                (service.lower(), state, consecutive_failures, last_failure_time, tripped_time),
            )
            conn.commit()

    def get_all_circuit_breakers(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM circuit_breakers")
            return [dict(r) for r in cursor.fetchall()]

    def get_recovery_history(self, limit: int = 50) -> List[RecoveryHistoryRecord]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM recovery_history ORDER BY id DESC LIMIT ?",
                (limit,),
            )
            return [RecoveryHistoryRecord(**dict(r)) for r in cursor.fetchall()]

    def get_stats(self) -> Dict[str, int]:
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'firing' THEN 1 ELSE 0 END) as firing,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
                FROM incidents
            """)
            row = cursor.fetchone()
            return {
                "total": row["total"] or 0,
                "firing": row["firing"] or 0,
                "resolved": row["resolved"] or 0,
            }

incident_store = IncidentStore()