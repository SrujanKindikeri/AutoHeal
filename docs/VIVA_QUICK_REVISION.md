# MovieFlow AutoHeal — Viva Quick Revision Cheat Sheet
**Course:** INT333 — Cloud Infrastructure & Automation Engineering  
**Project:** MovieFlow AutoHeal — Intelligent Infrastructure Monitoring, Automated Deployment & Self-Healing Platform  
**Purpose:** Rapid 5-minute pre-viva review sheet  

---

## 1. The 30-Second Elevator Pitch
> *"MovieFlow AutoHeal is an automated infrastructure monitoring and self-healing platform designed for a distributed social streaming application. It pairs Prometheus and Blackbox synthetic probing with a Python/FastAPI decision engine and containerized Ansible automation. When a service fails, AutoHeal classifies the incident, enforces strict safety boundaries—including hard-coded database protection, 300-second anti-flap cooldowns, and 3-strike circuit breakers—and simulates or executes idempotent remediation, reducing MTTR while keeping stateful databases 100% safe."*

---

## 2. The 2-Minute Project Introduction
> *"Good morning/afternoon, examiners. In modern cloud microservices, high availability is critical, but manual incident triage introduces prolonged downtime—often taking 15 to 30 minutes for engineers to detect, diagnose, and restart failing processes. Conversely, naive automated restart policies risk catastrophic crash loops or data corruption if applied to databases.*
>
> *To address this, our project implements **MovieFlow AutoHeal**, an end-to-end self-healing architecture built around the MovieFlow social streaming platform. We deployed the application stack—Next.js, Django/Daphne ASGI, PostgreSQL, and Redis—alongside a complete observability tier including Prometheus, Alertmanager, Grafana, Blackbox Exporter, Node Exporter, and cAdvisor.*
>
> *The heart of our platform is the custom Python AutoHeal engine. When Prometheus detects an anomaly through synthetic HTTP probes, Alertmanager pushes a webhook to AutoHeal. AutoHeal deterministically classifies the failure, evaluates confidence, and checks concentric defensive guardrails: an approved service allowlist, an immutable forbidden list protecting PostgreSQL and monitoring tools, a 300-second cooldown timer, and a consecutive-failure circuit breaker. Remediations are dispatched as modular Ansible playbooks running in dry-run simulation mode (`DRY_RUN=True`).*
>
> *All operational telemetry is exposed via an enhanced 44-panel Grafana dashboard. In our Phase 10 evaluation, all 43 automated test assertions passed, verifying sub-millisecond decision latencies (0.12 ms) and robust failure rejection without a single second of live service disruption."*

---

## 3. Architecture in One Paragraph
MovieFlow AutoHeal deploys 11 Docker containers across an internal bridge network (`movieflow_net`). Prometheus scrapes host hardware telemetry from Node Exporter, container cgroups from cAdvisor, AutoHeal metrics, and synthetic HTTP availability probes from Blackbox Exporter. When a probe fails, Prometheus fires an alert through Alertmanager to the Python/FastAPI AutoHeal daemon (`:5001`). AutoHeal classifies the incident, verifies safety allowlists, cooldown timers, and circuit breakers, records the event in SQLite (`/data/autoheal.db`), and dispatches containerized Ansible playbooks (`movieflow-ansible-runner`) in check-mode (`--check`). All telemetry is visualized live on an enhanced 44-panel Grafana dashboard (`:3000`).

---

## 4. Technology Stack Cheat Sheet

| Component | Technology | Version | Key Function / Role |
| :--- | :--- | :---: | :--- |
| **Frontend** | Next.js / React | `14.2.18` / `18.3.1` | Client UI; probed at `/api/health` (:6060 -> :3000) |
| **Backend** | Django / Daphne | `5.1.15` / `4.1.2` | REST API & WebSockets; probed at `/api/core/health/` (:8000) |
| **Database** | PostgreSQL | `15-alpine` | Relational store; persistent volume; **FORBIDDEN from auto-restart** |
| **Cache/PubSub**| Redis | `7-alpine` | Channels layer & cache; port 6379 |
| **Metrics DB** | Prometheus | `v3.4.0` | Scrapes 8 targets every 15s; evaluates alert rules (:9090) |
| **Alert Router**| Alertmanager | `v0.28.0` | Deduplicates and routes alerts to AutoHeal webhook (:9093) |
| **Visualizer** | Grafana | `11.1.0` | 44 panels across 8 rows; auto-reloads in 15s (:3000) |
| **Synthetic** | Blackbox Exporter | `v0.25.0` | Probes HTTP endpoints from outside the container (:9115) |
| **Host/Cgroups**| Node Exp / cAdvisor| `v1.8.2` / `v0.49.1` | Host hardware & container cgroup metrics (:9100 / :8080) |
| **Decision** | Python / FastAPI | `3.11` / `0.115.x` | Webhook ingestion, classification, safety gates, metrics (:5001)|
| **Remediation** | Ansible Core | `2.16.x` | Idempotent playbooks executed via runner container |

---

## 5. 10 Key Metrics to Remember

1. **`8/8 Targets UP`**: All 8 Prometheus scrape targets are currently active and healthy.
2. **`0 FIRING Alerts`**: Baseline healthy system state (`sum(ALERTS{alertstate="firing"}) = 0`).
3. **`0.0025 ms`**: Average latency for AutoHeal alert classification ($n=50$).
4. **`0.1213 ms`**: Average latency for AutoHeal decision engine and SQLite recording ($n=50$).
5. **`0.0005 ms`**: Average latency for safety validation (allowlist/forbidden check, $n=50$).
6. **`19.21 ms`**: Average end-to-end HTTP pipeline latency via FastAPI TestClient ($n=20$).
7. **`3.67 seconds`**: Measured execution duration of simulated Ansible recovery.
8. **`10.2 ms / 31.6 ms`**: Average Blackbox probe latency for Frontend / Backend health checks.
9. **`300 seconds`**: Duration of the anti-flap cooldown window per service.
10. **`3 consecutive failures`**: Threshold required to trip the circuit breaker to `OPEN` (resets after 600s).

---

## 6. 10 Critical Concepts You Must Know

1. **MAPE-K Loop:** Monitor (Prometheus), Analyze (Alertmanager), Plan (AutoHeal), Execute (Ansible), Knowledge (SQLite).
2. **Synthetic Probing (Blackbox):** Testing real application availability from the client perspective over HTTP rather than just checking if the process is running.
3. **Idempotency:** A property of Ansible playbooks ensuring that running a task repeatedly produces the same result without unintended state alterations.
4. **Anti-Flap Cooldown (300s):** Suppresses repeat recovery actions within 5 minutes to prevent infinite restart storms on persistent bugs.
5. **Circuit Breaker Pattern:** Automatically halts automated restarts after 3 consecutive failures to prevent service thrashing, requiring human triage.
6. **Forbidden Target Shield:** Hard-coded architectural rule preventing AutoHeal from ever touching PostgreSQL or monitoring containers.
7. **Dry-Run Check Mode (`--check`):** Enforcing `DRY_RUN=True` so Ansible validates tasks in simulation without altering live containers.
8. **Alert Fingerprinting:** 64-bit cryptographic hash of alert labels used for stateful incident deduplication.
9. **Confidence Threshold ($\ge 0.90$):** Math gating requiring high certainty before remediation; low-confidence alerts route to human SREs.
10. **Mean Time to Recovery (MTTR):** Time to detect, triage, and restore a failed service; automated closed-loop systems minimize triage lag.

---

## 7. 15 Likely Viva Questions & High-Scoring Answers

1. **Q: Why not use Docker's built-in `restart: always`?**  
   *A:* `restart: always` is a blind open loop; it cannot classify failures, has no cooldown, trips no circuit breakers, and will blindly restart a corrupted database in an infinite crash loop.
2. **Q: Why is PostgreSQL forbidden from automated recovery?**  
   *A:* PostgreSQL is stateful. Uncontrolled restarts during active writes risk transaction log (WAL) corruption, table locks, and split-brain states. It requires DBA inspection.
3. **Q: How does Blackbox Exporter differ from Prometheus?**  
   *A:* Prometheus collects metrics; Blackbox Exporter actively sends synthetic HTTP GET requests to endpoints to test if they return HTTP 200 OK.
4. **Q: What happens if an unknown alert arrives?**  
   *A:* The classifier labels it service `unknown` with confidence 0.50. Because $0.50 < 0.90$, the decision engine assigns `manual_investigation` and skips automated recovery.
5. **Q: How does the cooldown timer prevent flapping?**  
   *A:* When a service recovers, a 300s timestamp is set. Any identical alert arriving within 5 minutes returns `SKIPPED_COOLDOWN`, halting restart loops.
6. **Q: What causes the circuit breaker to trip?**  
   *A:* Three consecutive recovery failures on the same service trip the breaker from `CLOSED` to `OPEN`, blocking further attempts for 10 minutes.
7. **Q: What is Ansible check mode?**  
   *A:* Passing `--check` simulates playbook task execution against targets without actually executing container restart commands.
8. **Q: Why use SQLite in WAL mode for AutoHeal?**  
   *A:* Write-Ahead Logging allows concurrent readers (like Prometheus `/metrics` scrapes) without blocking writers (like incoming alert webhooks).
9. **Q: How is the Next.js frontend probed?**  
   *A:* Blackbox Exporter probes `http://frontend:3000/api/health` every 15s, expecting HTTP 200 within a 5s timeout.
10. **Q: How is the Django backend probed?**  
    *A:* Blackbox probes `http://backend:8000/api/core/health/`, which dynamically asserts database and Redis channel layer connectivity.
11. **Q: What does the blue banner on Grafana indicate?**  
    *A:* It displays `DRY-RUN / SIMULATED (AUTO_RECOVERY: OFF)`, explicitly confirming that all self-healing actions operate in safe simulation mode.
12. **Q: What did the 43 test assertions verify?**  
    *A:* Classification accuracy, boundary enforcement (blocking PostgreSQL), dry-run simulation, deduplication, cooldowns, circuit breakers, and webhook API handling.
13. **Q: What is the main security risk of mounting `docker.sock`?**  
    *A:* It provides container-breakout-level root access to the host Docker daemon. In production, a rootless API proxy should be used instead.
14. **Q: What was the measured decision engine latency?**  
    *A:* Average 0.1213 ms, proving that decision making adds near-zero overhead to incident response.
15. **Q: Did you execute real container failure injection?**  
    *A:* No; in Phase 10, Stage 1 safe simulation was completed to protect database integrity. Real failure injection was formally proposed for Stage 2.

---

## 8. Common Mistakes to Avoid & What NOT to Claim

- ❌ **DO NOT CLAIM:** *"We tested real production auto-recovery and crashed the database."*  
  ✅ **CORRECT STATEMENT:** *"We evaluated the decision engine and playbooks in safe simulation mode (`DRY_RUN=True`) using isolated unit and integration tests to protect data integrity."*
- ❌ **DO NOT CLAIM:** *"We measured real physical MTTR of container restarts."*  
  ✅ **CORRECT STATEMENT:** *"We benchmarked the software decision pipeline latency (19.21 ms); physical MTTR measurement was deferred to future Stage 2 testing."*
- ❌ **DO NOT CLAIM:** *"AutoHeal automatically repairs broken PostgreSQL databases."*  
  ✅ **CORRECT STATEMENT:** *"PostgreSQL is strictly forbidden from automated recovery; database issues trigger operator alerts to prevent data corruption."*
- ❌ **DO NOT CLAIM:** *"The Grafana dashboard has mock data."*  
  ✅ **CORRECT STATEMENT:** *"All 44 panels use active PromQL queries against live Prometheus time-series data."*
- ❌ **DO NOT FORGET:** Mention the **concentric safety layers** (Allowlist -> Forbidden Shield -> Cooldown -> Circuit Breaker -> Confidence Gate -> Dry-Run). Examiners love safety architecture!
