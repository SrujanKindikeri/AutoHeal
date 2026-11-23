# MovieFlow AutoHeal — Academic Project Screenshot Checklist
**Course:** INT333 — Cloud Infrastructure & Automation Engineering  
**Project:** MovieFlow AutoHeal — Intelligent Infrastructure Monitoring, Automated Deployment & Self-Healing Platform  
**Purpose:** Formal academic screenshot evidence inventory for project reports, viva defense, and documentation.  

---

## Screenshot Inventory & Figure Mapping

| Fig # | Screenshot Filename | Target View / URL / Command | What It Must Show | Academic Purpose / Why Needed | Suggested Report Caption |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Fig 1** | `01_movieflow_frontend.png` | Browser: `http://localhost:6060` | MovieFlow Next.js landing page with rooms and branding | Proves functional deployment of client-facing social streaming application | *Figure 1: MovieFlow Next.js Frontend User Interface running on host port 6060.* |
| **Fig 2** | `02_docker_container_ps.png` | PowerShell: `docker ps` table | All 11 containers in `healthy` state with continuous uptimes and 0 restarts | Proves multi-container orchestration baseline and service health | *Figure 2: Active Docker container topology showing healthy status across application and monitoring tiers.* |
| **Fig 3** | `03_docker_compose_config.png` | IDE: `docker-compose.yml` / `docker-compose.monitoring.yml` | Declarative service configurations, volumes, and healthchecks | Documents infrastructure-as-code orchestration and service dependencies | *Figure 3: Multi-tier Docker Compose service specification with integrated container healthchecks.* |
| **Fig 4** | `04_prometheus_targets_up.png` | Browser: `http://localhost:9090/targets` | All 8 scrape targets reporting green state `UP` (8/8) | Verifies active Prometheus polling across monitoring exporters and Blackbox probes | *Figure 4: Prometheus active scrape targets verifying 100% reachability across all 8 configured endpoints.* |
| **Fig 5** | `05_prometheus_metric_query.png`| Browser: `http://localhost:9090/graph` | PromQL query evaluation (e.g. `probe_success` or `sum(up)`) | Demonstrates live time-series storage and TSDB querying capability | *Figure 5: Prometheus PromQL expression evaluation asserting synthetic availability metrics.* |
| **Fig 6** | `06_prometheus_alert_rules.png` | Browser: `http://localhost:9090/alerts` | Alert rules list (`BackendUnavailable`, `FrontendUnavailable`, etc.) | Proves automated alert threshold definitions and 30s evaluation windows | *Figure 6: Configured Prometheus alert rules showing inactive/healthy baseline state.* |
| **Fig 7** | `07_alertmanager_status.png` | Browser: `http://localhost:9093` | Alertmanager UI showing active receiver routing to AutoHeal | Validates alert deduplication, grouping, and webhook routing configuration | *Figure 7: Alertmanager status and routing configuration targeting the AutoHeal webhook daemon.* |
| **Fig 8** | `08_autoheal_health_endpoint.png`| Browser / Curl: `http://localhost:5001/health` | JSON response: `status: ok`, `dry_run: true`, `version: 1.1.0` | Proves AutoHeal daemon availability and active safety configuration | *Figure 8: AutoHeal REST API `/health` endpoint confirming active dry-run simulation mode.* |
| **Fig 9** | `09_autoheal_recovery_status.png`| Browser / Curl: `http://localhost:5001/recovery/status` | JSON response: `circuit_breakers: closed`, `cooldowns`, `dry_run: true` | Documents runtime circuit breaker and cooldown tracking states | *Figure 9: AutoHeal `/recovery/status` endpoint displaying circuit breaker and cooldown telemetry.* |
| **Fig 10** | `10_ansible_playbook_structure.png`| IDE: `ansible/playbooks/recover_backend.yml` | Modular playbook with pre-check, restart, and health verification | Demonstrates idempotent Ansible recovery automation design | *Figure 10: Declarative Ansible recovery playbook implementing post-restart health verification.* |
| **Fig 11** | `11_grafana_overview_dashboard.png`| Browser: `http://localhost:3000` | Full-page view of the 44-panel "MovieFlow AutoHeal" dashboard | Demonstrates single-pane-of-glass observability across all 8 rows | *Figure 11: Comprehensive 44-panel Grafana observability dashboard (`movieflow-infra-dashboard`).* |
| **Fig 12** | `12_grafana_service_health.png`| Browser: Dashboard Section B | Blackbox probe status panels and latency timeseries curves (ms) | Proves synthetic endpoint latency tracking (frontend ~10ms, backend ~31ms) | *Figure 12: Grafana Section B: Service response latency and HTTP probe status codes.* |
| **Fig 13** | `13_grafana_infrastructure.png`| Browser: Dashboard Section C | Host CPU utilization %, host RAM usage, and container network I/O | Documents underlying hardware and cgroup resource monitoring | *Figure 13: Grafana Section C: Host and container infrastructure resource utilization.* |
| **Fig 14** | `14_grafana_alert_monitoring.png`| Browser: Dashboard Section E | Active firing alerts table and severity breakdown (Critical/Warning) | Demonstrates real-time incident tracking and alert resolution visualization | *Figure 14: Grafana Section E: Alert monitoring and active firing incident timeline.* |
| **Fig 15** | `15_grafana_autoheal_metrics.png`| Browser: Dashboard Section F | Recovery attempts (1), simulated (1), successes (0), duration (3.67s) | Proves Prometheus ingestion of live AutoHeal decision engine telemetry | *Figure 15: Grafana Section F: AutoHeal engine execution metrics and recovery telemetry.* |
| **Fig 16** | `16_grafana_dry_run_indicator.png`| Browser: Dashboard Section A/F | High-contrast blue stat banner: `DRY-RUN / SIMULATED ACTIVE` | Proves visual communication of simulation mode for operator safety | *Figure 16: High-visibility safety guard banner communicating active simulation mode.* |
| **Fig 17** | `17_pytest_test_results.png` | PowerShell: `docker exec ... pytest -v` | Terminal showing `43 passed, 1 warning in 9.27s` | Proves complete regression passing across classification, boundaries, and safety | *Figure 17: Automated test suite execution confirming 43 passing assertions in isolated test environment.* |
| **Fig 18** | `18_git_preservation_status.png`| PowerShell: `git status --short` | Git status showing untracked files intact and zero commits made | Proves strict adherence to academic preservation rules and non-destructive work | *Figure 18: Git repository status verifying preservation of pre-existing worktrees and untracked files.* |

---

## Capture Guidelines & Best Practices for Academic Submission

1. **Resolution & Theme:** Capture all browser screenshots in standard 1920x1080 resolution using Grafana's default dark theme for high-contrast clarity.
2. **Terminal Evidence:** Ensure PowerShell command prompts clearly display the working directory and non-destructive execution commands.
3. **No Sensitive Information:** Ensure screenshots contain no exposed passwords, secret tokens, private IP addresses, or personal credentials.
4. **Authenticity Guarantee:** Only capture live, authentic runtime screenshots. Never mock, edit, or fabricate panel values or terminal outputs.
