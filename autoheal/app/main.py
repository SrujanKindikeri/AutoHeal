import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from app.config import settings
from app.logging_config import logger
from app.models import HealthResponse, StatusResponse, IncidentRecord
from app.incident_store import incident_store
from app.webhook import router as webhook_router
from app.api_recovery import router as recovery_router
from app.metrics import metrics_registry

START_TIME = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s on port %d (DRY_RUN=%s)", settings.APP_NAME, settings.APP_VERSION, settings.PORT, settings.DRY_RUN)
    incident_store.init_schema()
    yield
    logger.info("Shutting down %s", settings.APP_NAME)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="MovieFlow AutoHeal Engine - Intelligent infrastructure monitoring, incident classification, and recovery recommendation platform.",
    lifespan=lifespan,
)

# Enable CORS for local dashboards / internal monitoring
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhook_router)
app.include_router(recovery_router)

@app.get(
    "/metrics",
    tags=["Monitoring"],
    summary="Prometheus metrics exposition endpoint",
)
async def get_metrics():
    """Exposes internal AutoHeal engine metrics in standard Prometheus text exposition format."""
    return PlainTextResponse(
        content=metrics_registry.generate_prometheus_text(),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check probe endpoint",
)
async def health_check():
    """Returns application health and database connection status."""
    db_connected = False
    try:
        # Simple test query to check database connectivity
        stats = incident_store.get_stats()
        db_connected = True
    except Exception as ex:
        logger.error("Database health check failed: %s", ex)

    return HealthResponse(
        status="ok" if db_connected else "degraded",
        service="autoheal-engine",
        version=settings.APP_VERSION,
        dry_run=settings.DRY_RUN,
        database_connected=db_connected,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

@app.get(
    "/status",
    response_model=StatusResponse,
    tags=["System"],
    summary="Engine operational status and statistics",
)
async def engine_status():
    """Returns engine runtime statistics, operational mode, and incident metrics."""
    stats = incident_store.get_stats()
    uptime = time.time() - START_TIME

    return StatusResponse(
        status="active",
        service="autoheal-engine",
        mode=settings.EXECUTION_MODE.lower(),
        dry_run=settings.DRY_RUN,
        total_incidents=stats["total"],
        firing_incidents=stats["firing"],
        resolved_incidents=stats["resolved"],
        uptime_seconds=round(uptime, 2),
    )

@app.get(
    "/incidents",
    response_model=List[IncidentRecord],
    tags=["Incidents"],
    summary="List recorded incidents with optional filters",
)
async def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status (firing/resolved)"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    limit: int = Query(50, ge=1, le=500, description="Max records to return"),
):
    """Retrieves incident history from the persistent SQLite database."""
    return incident_store.list_incidents(status=status, service=service, limit=limit)

@app.get(
    "/incidents/{incident_id}",
    response_model=IncidentRecord,
    tags=["Incidents"],
    summary="Get details for a specific incident by ID",
)
async def get_incident_by_id(incident_id: str):
    """Retrieves a single incident by its unique UUID."""
    incident = incident_store.get_incident(incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return incident

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
