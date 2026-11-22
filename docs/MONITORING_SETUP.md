# MovieFlow Infrastructure Monitoring Setup Guide

This document provides a comprehensive operational guide for the monitoring infrastructure deployed for the **MovieFlow** application as part of the **INT333 AutoHeal** project.

---

## 1. Monitoring Architecture & Topology

The monitoring stack operates within the existing Docker environment alongside the MovieFlow application components. All containers communicate over the dedicated bridge network `movieflow_net`.

```
                                    +-----------------------+
                                    |     Administrator     |
                                    +-----------+-----------+
                                                |
                         +----------------------+----------------------+
                         | (Port 3000)                                 | (Port 9090)
                         v                                             v
              +---------------------+                       +---------------------+
              |       Grafana       |                       |     Prometheus      |
              |   (Visualization)   +---------------------->|   (Metrics Engine)  |
              +----------+----------+      (Port 9090)      +----------+----------+
                         |                                             |
                         | (Volume: grafana_data)                      | (Volume: prometheus_data)
                         v                                             v
               Persistent Dashboard                           Scrape Targets (Every 15s)
               & Preference Store                                      |
                                         +-----------------------------+-----------------------------+
                                         |                             |                             |
                                         v (Port 9100)                 v (Port 8080)                 v (Port 9090)
                              +---------------------+       +---------------------+       +---------------------+
                              |    Node Exporter    |       |       cAdvisor      |       |  Prometheus (Self)  |
                              |  (Host/WSL Metrics) |       | (Container Metrics) |       |  (Engine Metrics)   |
                              +----------+----------+       +----------+----------+       +---------------------+
                                         |                             |
                                  Host /proc & /sys            Docker Socket & cgroups
                                         |                             |
                              +----------+-----------------------------+----------+
                              |         MovieFlow Core Application Containers    |
                              |  [frontend:6060] [backend:8000] [postgres:5432]  |
                              |                     [redis:6379]                  |
                              +---------------------------------------------------+
```

---

## 2. Component Details & Configurations

### A. Prometheus (Metrics Engine)
- **Container Name:** `movieflow_prometheus`
- **Image:** `prom/prometheus:v3.4.0`
- **Port:** `9090:9090`
- **Persistent Volume:** `prometheus_data` mounted at `/prometheus`
- **Scrape Configuration:** `monitoring/prometheus/prometheus.yml`
  - Global scrape interval: `15s`
  - Scrape timeout: `10s`
  - Evaluation interval: `15s`
- **Scrape Targets:**
  1. `prometheus:9090` (Self monitoring)
  2. `node-exporter:9100` (Node Exporter system metrics)
  3. `cadvisor:8080` (cAdvisor container metrics)
- **Healthcheck:** `wget -q --tries=1 --spider http://localhost:9090/-/healthy || exit 1`

### B. Grafana (Visualization Platform)
- **Container Name:** `movieflow_grafana`
- **Image:** `grafana/grafana:11.1.0`
- **Port:** `3000:3000`
- **Persistent Volume:** `grafana_data` mounted at `/var/lib/grafana`
- **Auto-Provisioning:**
  - **Datasources (`monitoring/grafana/provisioning/datasources/prometheus.yml`):** Automatically registers Prometheus at `http://prometheus:9090` with UID `PBFA97CFB590B2093` as the default datasource.
  - **Dashboard Provider (`monitoring/grafana/provisioning/dashboards/dashboard_provider.yml`):** Automatically loads dashboards from `/var/lib/grafana/dashboards`.
  - **Dashboard Definition (`monitoring/grafana/dashboards/movieflow_infrastructure.json`):** Pre-built 7-panel production dashboard featuring:
    - Service Target Availability (`up`)
    - Host CPU Utilization (%)
    - Host Memory Usage & Availability
    - Container CPU Usage
    - Container Memory Usage
    - Container Network Received (Bytes/s)
    - Container Network Transmitted (Bytes/s)
- **Healthcheck:** `wget -q --tries=1 --spider http://localhost:3000/api/health || exit 1`

### C. Node Exporter (Host System Metrics)
- **Container Name:** `movieflow_node_exporter`
- **Image:** `prom/node-exporter:v1.8.2`
- **Port:** `9100:9100`
- **Host Mounts:**
  - `/proc:/host/proc:ro`
  - `/sys:/host/sys:ro`
  - `--path.procfs=/host/proc`
  - `--path.sysfs=/host/sys`
- **Collector Exclusions:** Excludes non-host filesystem types (`--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)`)
- **Healthcheck:** `wget -q --tries=1 --spider http://localhost:9100/metrics || exit 1`

### D. cAdvisor (Container Resource Metrics)
- **Container Name:** `movieflow_cadvisor`
- **Image:** `gcr.io/cadvisor/cadvisor:v0.49.1`
- **Port:** `8080:8080`
- **Host Mounts:**
  - `/:/rootfs:ro`
  - `/var/run/docker.sock:/var/run/docker.sock:ro`
  - `/sys:/sys:ro`
  - `/sys/fs/cgroup:/sys/fs/cgroup:ro`
- **Healthcheck:** `wget -q --tries=1 --spider http://localhost:8080/healthz || exit 1`

---

## 3. Network Ports & Data Persistence

### Port Mappings Summary

| Service | Internal Port | Host Port | Protocol | Purpose | Authentication |
|---|---|---|---|---|---|
| **Grafana** | 3000 | **3000** | HTTP | Monitoring UI & Dashboards | Basic Auth / Session (`admin:admin` default) |
| **Prometheus** | 9090 | **9090** | HTTP | Metrics UI, TSDB & Scrape Engine | Open / Internal API |
| **Node Exporter** | 9100 | **9100** | HTTP | Host OS Metrics Endpoint | Metrics scrape endpoint |
| **cAdvisor** | 8080 | **8080** | HTTP | Container Metrics Web UI & API | Metrics scrape endpoint |
| *MovieFlow Frontend* | 3000 | **6060** | HTTP | Next.js Web Application | User Auth |
| *MovieFlow Backend* | 8000 | **8000** | HTTP/WS | Daphne ASGI Application | JWT / Session |
| *PostgreSQL* | 5432 | **5432** | TCP | Relational Database | Database Credentials |
| *Redis* | 6379 | **6379** | TCP | Cache & Channel Layer | Password / Open |

### Data Volumes Summary

| Volume Name | Target Container Path | Content | Retention Policy |
|---|---|---|---|
| `prometheus_data` | `/prometheus` | Prometheus TSDB blocks & write-ahead log | Persistent across restarts |
| `grafana_data` | `/var/lib/grafana` | User accounts, preferences, dashboard edits | Persistent across restarts |
| `postgres_data` | `/var/lib/postgresql/data` | Relational application database | Persistent across restarts |
| `redis_data` | `/data` | Redis in-memory dumps & persistent cache | Persistent across restarts |
| `media_volume` | `/app/media` | User-uploaded movies, audio, and covers | Persistent across restarts |
| `static_volume` | `/app/staticfiles` | Collected Django static assets | Preserved across restarts |

> [!CAUTION]
> Never run `docker compose down -v` or `docker volume prune`. Doing so will permanently destroy TSDB history, Grafana customizations, the application database, and all uploaded media files.

---

## 4. Operational Commands

All commands should be executed from the MovieFlow repository root:
`C:\Users\kindi\OneDrive\Documents\AutoHeal\MultiFlow\MultiFlow`

### Starting Services

Start the entire stack (Application + Monitoring):
```powershell
docker compose up -d
```

Start only the monitoring infrastructure:
```powershell
docker compose up -d node-exporter cadvisor prometheus grafana
```

### Checking Status & Health
```powershell
docker compose ps
```

Verify specific container health logs:
```powershell
docker inspect --format='{{json .State.Health}}' movieflow_prometheus | ConvertFrom-Json
docker inspect --format='{{json .State.Health}}' movieflow_grafana | ConvertFrom-Json
```

### Viewing Logs
```powershell
# Tail Prometheus logs
docker compose logs -f prometheus

# Tail Grafana logs
docker compose logs -f grafana

# Tail Node Exporter logs
docker compose logs -f node-exporter

# Tail cAdvisor logs
docker compose logs -f cadvisor
```

### Restarting Monitoring Components
```powershell
# Restart Prometheus (e.g., after updating prometheus.yml)
docker compose restart prometheus

# Restart Grafana
docker compose restart grafana
```

### Safely Stopping Services
```powershell
# Stop monitoring stack while keeping application running
docker compose stop node-exporter cadvisor prometheus grafana

# Stop all services without deleting volumes
docker compose down
```

---

## 5. Verification & Health Validation

### A. Verify Prometheus Targets via API
Run in PowerShell:
```powershell
$targets = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/targets"
$targets.data.activeTargets | Select-Object scrapePool, health, lastScrapeDuration | Format-Table -AutoSize
```
Expected output:
- `cadvisor` -> `health: up`
- `node-exporter` -> `health: up`
- `prometheus` -> `health: up`

### B. Verify Grafana Datasource via API
```powershell
$headers = @{ Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin")) }
Invoke-RestMethod -Uri "http://localhost:3000/api/datasources/uid/PBFA97CFB590B2093/health" -Headers $headers
```
Expected output:
- `message: "Successfully queried the Prometheus API."`
- `status: "OK"`

### C. Verify Grafana Provisioned Dashboard
```powershell
$headers = @{ Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin")) }
$dash = Invoke-RestMethod -Uri "http://localhost:3000/api/dashboards/uid/movieflow-infra-dashboard" -Headers $headers
$dash.dashboard.title
```
Expected output:
- `"MovieFlow Infrastructure Monitoring"`

---

## 6. Useful PromQL Queries for MovieFlow

Use these queries in Prometheus Graph UI (`http://localhost:9090/graph`) or Grafana panel editors:

### Target Availability
Check if all monitored endpoints are reachable:
```promql
up
```
*(Returns `1` for healthy/up targets and `0` for down targets).*

### Host CPU Utilization (%)
Calculates overall CPU utilization across all cores excluding idle:
```promql
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)
```

### Host Memory Utilization (%)
Calculates percentage of used memory:
```promql
100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))
```

### Host Memory Available (Gigabytes)
```promql
node_memory_MemAvailable_bytes / (1024 * 1024 * 1024)
```

### Container CPU Usage (WSL2 / Linux Virtual Machine)
```promql
sum(rate(container_cpu_usage_seconds_total[1m])) by (image, name)
```

### Container Memory Usage (Megabytes)
```promql
sum(container_memory_usage_bytes) by (image, name) / (1024 * 1024)
```

### Container Network Throughput
- **Receive (Bytes/sec):**
  ```promql
  sum(rate(container_network_receive_bytes_total[1m])) by (name)
  ```
- **Transmit (Bytes/sec):**
  ```promql
  sum(rate(container_network_transmit_bytes_total[1m])) by (name)
  ```

---

## 7. Windows Docker Desktop & WSL2 Technical Considerations

During the deployment of Node Exporter and cAdvisor on Windows 11 with Docker Desktop, specific virtualization characteristics must be understood:

### Node Exporter Virtualization Boundary
Node Exporter mounts `/proc` and `/sys` from the underlying Docker Desktop WSL2 utility VM (`linux-headers-...-microsoft-standard-WSL2`). Consequently:
- The CPU core count, load average, and memory capacity reported correspond to the **WSL2 Virtual Machine** allocated by Windows (typically up to 50% of total host RAM by default), not the bare-metal Windows host operating system.
- Disk statistics reflect virtual ext4 vhdx mounts rather than NTFS host drives directly.

### cAdvisor Container Identification on Docker Desktop
On Docker Desktop for Windows using the containerd image store / overlayfs storage driver:
- cAdvisor successfully starts, passes its HTTP `/healthz` probe, and streams metrics to Prometheus.
- However, container-level overlayfs inspection can report `failed to identify the read-write layer ID ... mount-id: no such file or directory` because Docker Desktop isolates container layer metadata inside the VM's internal containerd store.
- As a result, container metrics may be aggregated under the root container (`id="/"`) rather than showing individual container labels for certain disk layers. System metrics, memory usage, CPU usage, and network traffic remain fully functional.

---

## 8. Safe Password Management Guidance

1. **Grafana Credentials:**
   - The default development credentials are `admin:admin`.
   - In production or shared environments, override the initial password by providing environment variables `GF_SECURITY_ADMIN_USER` and `GF_SECURITY_ADMIN_PASSWORD` via an external, untracked `.env` file or Docker secrets.
   - Never commit plain-text passwords or tokens to version control.
2. **Prometheus Access:**
   - Prometheus is currently deployed on internal port `9090`. For production, configure web basic authentication (`web.config.file`) or restrict access behind an authenticating reverse proxy (such as Nginx or Traefik).
3. **Database Credentials:**
   - PostgreSQL and Redis credentials must remain exclusively in the local `.env` file, loaded via Docker Compose `env_file`.

---

## 9. Troubleshooting Guide

### Issue 1: Target Shows DOWN (`up == 0`)
- **Symptoms:** In Prometheus Targets UI (`/targets`), a scrape job shows red `DOWN`.
- **Causes:** Container crashed, network partition, or incorrect port/service name.
- **Resolution:**
  1. Check if the target container is running:
     ```powershell
     docker compose ps <service-name>
     ```
  2. Inspect container logs:
     ```powershell
     docker compose logs <service-name>
     ```
  3. Ensure both Prometheus and the target service share the same Docker network `movieflow_net`.
  4. Ensure target configuration in `monitoring/prometheus/prometheus.yml` uses the service name and internal port (e.g. `cadvisor:8080`), not `localhost`.

### Issue 2: Port Conflict on Host
- **Symptoms:** Docker returns `bind: address already in use` when starting Grafana (3000), Prometheus (9090), or cAdvisor (8080).
- **Causes:** Local services, Minikube, or background `kubectl port-forward` processes occupying the port.
- **Resolution:**
  1. Identify the process holding the port:
     ```powershell
     Get-NetTCPConnection -LocalPort 3000, 9090, 8080 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
     ```
  2. Stop the conflicting application or terminate the specific PID:
     ```powershell
     Stop-Process -Id <PID> -Force
     ```

### Issue 3: Scrape Timeout (`context deadline exceeded`)
- **Symptoms:** Target status displays `context deadline exceeded` in Prometheus targets.
- **Causes:** Target is under heavy resource contention or network latency exceeds `scrape_timeout: 10s`.
- **Resolution:**
  1. Check CPU load on the Docker host/VM.
  2. In `monitoring/prometheus/prometheus.yml`, adjust `scrape_timeout` to `15s` and `scrape_interval` to `30s` if operating on constrained student laptop hardware.

### Issue 4: Dashboard Not Appearing in Grafana
- **Symptoms:** Logging into Grafana shows an empty home dashboard; `MovieFlow Infrastructure Monitoring` is not listed.
- **Causes:** Provisioning file mount path mismatch or JSON syntax error in dashboard template.
- **Resolution:**
  1. Verify the dashboard file is mounted in container:
     ```powershell
     docker exec movieflow_grafana ls -la /var/lib/grafana/dashboards
     ```
  2. Verify dashboard provisioning YAML in `monitoring/grafana/provisioning/dashboards/dashboard_provider.yml`.
  3. Restart Grafana to trigger a reload:
     ```powershell
     docker compose restart grafana
     ```
