# MovieFlow Docker Deployment Guide

**Phase 3 Deliverable — INT333 AutoHeal Platform**  
**Repository Path:** `C:\Users\kindi\OneDrive\Documents\AutoHeal\MultiFlow\MultiFlow`  
**Deployment Date:** 2026-11-22  
**Target Environment:** Docker Compose (Docker Engine 29.9+, Docker Compose v5.7+)  

---

## 1. Architecture Overview

MovieFlow runs as a containerized multi-tier web application orchestrated with Docker Compose on an isolated bridge network (`movieflow_net`).

```
                              [ User Browser ]
                                     |
                +--------------------+--------------------+
                |                                         |
         :6060 (HTTP)                              :8000 (HTTP & WS)
                v                                         v
   +-------------------------+               +-------------------------+
   |   movieflow_frontend    |               |    movieflow_backend    |
   |   Next.js 14 Production |               | Django 5.1 + Daphne ASGI|
   |   (Node.js 20 Alpine)   |               |   (Python 3.11 Slim)    |
   +-------------------------+               +-------------------------+
                |                                         |
                |                               +---------+---------+
                |                               |                   |
                |                       :5432 (Postgres)     :6379 (Redis)
                |                               v                   v
                |                    +------------------+ +------------------+
                |                    |movieflow_postgres| |  movieflow_redis |
                |                    |  PostgreSQL 16   | |     Redis 7      |
                |                    +------------------+ +------------------+
                |                               |                   |
                v                               v                   v
          [ Browser Fetch ]             [postgres_data]       [redis_data]
      (Client talks directly               (Volume)             (Volume)
       to backend:8000 via CORS)
```

---

## 2. Docker Services Specification

### 2.1 `frontend` (`movieflow_frontend`)
- **Base Image:** `node:20-alpine`
- **Application:** Next.js 14.2.35 (React 18.3, TypeScript 5.6, Tailwind CSS 3.4)
- **Container Port:** `3000`
- **Host Port Mapping:** `6060:3000` (`${FRONTEND_PORT:-6060}:3000`)
- **Environment:**
  - `NODE_ENV: production`
  - `PORT: 3000`
  - `HOSTNAME: 0.0.0.0`
- **Build Args:**
  - `NEXT_PUBLIC_API_URL: http://localhost:8000`
  - `NEXT_PUBLIC_WS_URL: ws://localhost:8000`
- **Healthcheck:**
  - Command: `wget -qO- http://localhost:3000/api/health || exit 1`
  - Interval: 10s | Timeout: 5s | Retries: 3 | Start Period: 20s
- **Dependencies:** Depends on `backend` with `condition: service_healthy`.

### 2.2 `backend` (`movieflow_backend`)
- **Base Image:** `python:3.11-slim`
- **Application:** Django 5.1, Django REST Framework 3.15, Django Channels 4.1
- **Server:** Daphne ASGI Server 4.2 (`daphne -b 0.0.0.0 -p 8000 movieflow.asgi:application`)
- **Container Port:** `8000`
- **Host Port Mapping:** `8000:8000` (`${BACKEND_PORT:-8000}:8000`)
- **Environment:**
  - `DEBUG: ${DEBUG:-True}`
  - `SECRET_KEY: ${SECRET_KEY}` (Redacted in source)
  - `ALLOWED_HOSTS: "*"`
  - `DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
  - `REDIS_URL: redis://redis:6379/0`
  - `USE_SQLITE: "False"`
  - `USE_IN_MEMORY_CHANNELS: "False"`
  - `FRONTEND_URL: http://localhost:6060`
  - `CORS_ALLOWED_ORIGINS: http://localhost:6060,http://127.0.0.1:6060`
- **Volume Mounts:**
  - `./backend:/app` (live code mount)
  - `static_volume:/app/staticfiles`
  - `media_volume:/app/media`
- **Healthcheck:**
  - Command: `curl -f http://localhost:8000/api/core/health/`
  - Interval: 10s | Timeout: 5s | Retries: 3 | Start Period: 20s
- **Dependencies:** Depends on `postgres` and `redis` with `condition: service_healthy`.

### 2.3 `postgres` (`movieflow_postgres`)
- **Image:** `postgres:16-alpine`
- **Container Port:** `5432`
- **Host Port Mapping:** `5432:5432` (`${POSTGRES_PORT:-5432}:5432`)
- **Volume Mount:** `postgres_data:/var/lib/postgresql/data`
- **Healthcheck:**
  - Command: `pg_isready -U ${POSTGRES_USER:-movieflow_user} -d ${POSTGRES_DB:-movieflow_db}`
  - Interval: 5s | Timeout: 5s | Retries: 5

### 2.4 `redis` (`movieflow_redis`)
- **Image:** `redis:7-alpine`
- **Container Port:** `6379`
- **Host Port Mapping:** `6379:6379` (`${REDIS_PORT:-6379}:6379`)
- **Volume Mount:** `redis_data:/data`
- **Healthcheck:**
  - Command: `redis-cli ping`
  - Interval: 5s | Timeout: 5s | Retries: 5

---

## 3. Port Mappings Summary

| Service | Internal Port | Host Port | Protocol | Purpose |
|---|---|---|---|---|
| `frontend` | 3000 | **6060** | HTTP | Next.js Web Interface |
| `backend` | 8000 | **8000** | HTTP & WS | Daphne ASGI API & WebSockets |
| `postgres` | 5432 | **5432** | TCP | PostgreSQL Database |
| `redis` | 6379 | **6379** | TCP | Channel Layer & Cache |

---

## 4. Volumes and Persistent Data

| Docker Volume Name | Container Mount Point | Service | Data Stored |
|---|---|---|---|
| `multiflow_postgres_data` | `/var/lib/postgresql/data` | `postgres` | All relational data (users, auth, friends, metadata, room history) |
| `multiflow_redis_data` | `/data` | `redis` | In-memory message store and channel group backplane |
| `multiflow_media_volume` | `/app/media` | `backend` | Uploaded movies (`uploads/movies/`), tracks (`uploads/tracks/`), avatars |
| `multiflow_static_volume` | `/app/staticfiles` | `backend` | Collected Django static files |

> [!IMPORTANT]
> **Data Protection Rule:** Never run `docker-compose down -v` or `docker volume prune`. These named volumes retain all user accounts, profile avatars, uploaded media files, and watch room history across container rebuilds.

---

## 5. Environment Configuration

All sensitive secrets must be managed through `.env` files and never committed to source control.

Key variables:
- `DEBUG`: Set to `True` for development, `False` for production.
- `SECRET_KEY`: Django cryptographic signing key.
- `DATABASE_URL`: Full connection string (`postgresql://<user>:<password>@postgres:5432/<db>`).
- `REDIS_URL`: Redis URI (`redis://redis:6379/0`).
- `CORS_ALLOWED_ORIGINS`: Origins permitted to make API calls (`http://localhost:6060,http://127.0.0.1:6060`).
- `NEXT_PUBLIC_API_URL`: Backend URL used by frontend browser client (`http://localhost:8000`).
- `NEXT_PUBLIC_WS_URL`: WebSocket URL used by frontend browser client (`ws://localhost:8000`).

---

## 6. Build Instructions

### 6.1 Targeted Builds
```powershell
# Build backend image
docker-compose build backend

# Build frontend image
docker-compose build frontend
```

### 6.2 Full Build
```powershell
docker-compose build
```

---

## 7. Start / Stop Commands

### 7.1 Start Services
```powershell
# Start all services in background
docker-compose up -d

# Verify startup logs
docker-compose logs -f
```

### 7.2 Stop Services Safely (Preserving Data)
```powershell
# Stop and remove containers (data in volumes is PRESERVED)
docker-compose down

# DO NOT append -v flag, which destroys database and uploaded media!
```

### 7.3 Restart Individual Services
```powershell
docker-compose restart backend
docker-compose restart frontend
```

---

## 8. Health Verification Commands

### 8.1 Docker Container Health Status
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
All containers should display `(healthy)`.

### 8.2 HTTP Health Verification (PowerShell)
```powershell
# Backend Health Endpoint (Checks Postgres and Redis Channel Layer)
Invoke-RestMethod -Uri "http://localhost:8000/api/core/health/" | ConvertTo-Json

# Frontend Health Endpoint
Invoke-RestMethod -Uri "http://localhost:6060/api/health" | ConvertTo-Json

# Frontend Root Page
(Invoke-WebRequest -Uri "http://localhost:6060/" -UseBasicParsing).StatusCode
```

### 8.3 WebSocket Verification (Python on Host)
```powershell
& .\backend\venv\Scripts\python.exe -c "import socket, base64, os; s = socket.socket(); s.connect(('localhost', 8000)); key = base64.b64encode(os.urandom(16)).decode(); s.send(f'GET /ws/health/ HTTP/1.1\r\nHost: localhost:8000\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'.encode()); raw = s.recv(4096); print(raw.partition(b'\r\n\r\n')[0].decode('latin1').split('\r\n')[0])"
```
Expected output: `HTTP/1.1 101 Switching Protocols`

---

## 9. Changes Made to Docker Configuration

1. **`backend/.dockerignore` Created:**
   - Excluded Windows virtual environment (`venv/`), SQLite database (`db.sqlite3`), local environment files (`.env`), and cache directories (`__pycache__`) from the Docker build context.
   - Result: Reduced build context upload from ~600 MB to ~2.8 MB, dramatically accelerating build times.
2. **`docker-compose.yml` Healthchecks Added:**
   - Added backend native healthcheck hitting `GET /api/core/health/` every 10s via `curl`.
   - Added frontend native healthcheck hitting `GET /api/health` every 10s via `wget`.
   - Updated frontend `depends_on` to require `backend: condition: service_healthy`.

---

## 10. Rollback Approach

If a deployment fails or needs to be reverted to the previous state without losing data:

1. **Graceful Shutdown:**
   ```powershell
   docker-compose down
   ```
2. **Revert Configuration Edits:**
   ```powershell
   git checkout -- docker-compose.yml
   Remove-Item backend/.dockerignore
   ```
3. **Restart with Previous Configuration:**
   ```powershell
   docker-compose up -d
   ```
Because all database state and uploaded media live in persistent named volumes (`multiflow_postgres_data` and `multiflow_media_volume`), rolling back container images or configuration files leaves the data intact.
