# MovieFlow AutoHeal — Viva Voce Preparation Guide: Questions & Answers
**Course:** INT333 — Cloud Infrastructure & Automation Engineering  
**Project:** MovieFlow AutoHeal — Intelligent Infrastructure Monitoring, Automated Deployment & Self-Healing Platform  
**Total Questions:** 62 Categorized Questions with Short Answers and Expanded Explanations  

---

## Category A: Project Fundamentals

### Q1: What is MovieFlow AutoHeal?
- **Short Answer:** MovieFlow AutoHeal is an automated infrastructure monitoring and self-healing platform that continuously observes the MovieFlow multi-container web application, detects service failures via synthetic probes, and safely coordinates automated remediation using Ansible in dry-run simulation mode.
- **Expanded Explanation:** The project solves the problem of operational downtime in distributed systems. It combines Prometheus, Alertmanager, and Grafana for observability with a custom Python/FastAPI decision engine that parses alert webhooks, applies strict safety guardrails (cooldowns, circuit breakers, allowlists), and simulates or dispatches Ansible recovery playbooks.

### Q2: Why did you choose this project?
- **Short Answer:** Modern microservices have complex failure modes where manual triage introduces prolonged downtime. I wanted to apply Site Reliability Engineering (SRE) principles to build an intelligent, closed-loop control system that automates incident response safely.
- **Expanded Explanation:** Manual recovery is slow, error-prone, and inconsistent. By implementing closed-loop automation—monitoring, alerting, classification, decision-making, and remediation—we can drastically reduce Mean Time to Recovery (MTTR) while preventing runaway restart cascades through defensive engineering.

### Q3: What problem does your project solve?
- **Short Answer:** It eliminates manual human triage delays and prevents dangerous, unconstrained restart loops during service failures, ensuring rapid, policy-governed recovery while strictly protecting stateful databases from data corruption.
- **Expanded Explanation:** Traditional systems rely on on-call engineers to wake up, read logs, and manually run Docker commands, taking 15–30 minutes. Blind restart policies (like Docker `restart: always`) can infinitely flap or crash stateful databases. AutoHeal provides intelligent classification, strict database shielding, anti-oscillation cooldowns, and full observability.

### Q4: What is a "Self-Healing" infrastructure?
- **Short Answer:** A self-healing infrastructure is an autonomous software system that continuously monitors its own state, detects deviations from healthy baselines, and takes corrective actions without human intervention to restore normal operation.
- **Expanded Explanation:** It is based on the MAPE-K autonomic computing loop: Monitor (Prometheus/Blackbox), Analyze (Alertmanager), Plan (AutoHeal Decision Engine), and Execute (Ansible Runner), backed by Knowledge (SQLite Incident Store).

### Q5: What makes AutoHeal "Intelligent"?
- **Short Answer:** Rather than blindly restarting any failing container, AutoHeal classifies alerts using pattern matching, computes confidence scores, checks safety allowlists and cooldown states, and selects deterministic remediation playbooks based on formal policy.
- **Expanded Explanation:** If an unknown alert arrives, AutoHeal assigns a low confidence score (0.50) and refuses automated remediation, categorizing it for human manual investigation. It also distinguishes between stateless web services (which can be safely restarted) and stateful databases (which are strictly forbidden from automated restarts).

### Q6: What is the primary difference between automated recovery and self-healing?
- **Short Answer:** Automated recovery is often an open-loop script that restarts a container when it dies; self-healing is a closed-loop system that detects failures, validates safety policies, executes remediation, and verifies post-recovery health.
- **Expanded Explanation:** Self-healing includes health verification post-execution and updates incident state, telemetry, and circuit breaker counters to confirm the service is actually back online.

---

## Category B: Architecture

### Q7: Explain the overall system architecture.
- **Short Answer:** The architecture has three layers: the MovieFlow Application Layer (Next.js, Django/ASGI, PostgreSQL, Redis), the Observability Tier (Prometheus, Alertmanager, Grafana, Blackbox, Node Exporter, cAdvisor), and the Self-Healing Tier (AutoHeal daemon, SQLite store, Ansible runner).
- **Expanded Explanation:** All services communicate across an isolated Docker Compose bridge network (`movieflow_net`). Prometheus scrapes exporters and Blackbox probes. When an alert fires, Alertmanager pushes a webhook to AutoHeal (:5001). AutoHeal validates safety rules and triggers the Ansible runner container in dry-run check-mode, exposing metrics back to Prometheus and Grafana.

### Q8: How do the components communicate with each other?
- **Short Answer:** Components communicate via HTTP REST endpoints, synthetic HTTP probes, Prometheus pull-based scraping, Alertmanager JSON webhooks, and internal Docker DNS networking.
- **Expanded Explanation:** Frontend talks to Backend via HTTP port 8000; Backend communicates with PostgreSQL on port 5432 and Redis on 6379. Blackbox Exporter probes frontend/backend health endpoints. Prometheus scrapes Blackbox, exporters, and AutoHeal via HTTP GET `/metrics`. Alertmanager pushes alerts to AutoHeal via HTTP POST `/webhook/alerts`.

### Q9: Why use Docker Compose for containerization?
- **Short Answer:** Docker Compose provides a declarative, reproducible multi-container environment with isolated networking, service dependencies, volume persistence, and environment variable configuration in a single unified configuration.
- **Expanded Explanation:** It ensures that all 11 services boot in the correct dependency order (e.g., PostgreSQL and Redis must be healthy before Django starts; Prometheus must be healthy before Grafana provisions). It also enables clean service discovery using container service names like `http://backend:8000`.

### Q10: Why is MovieFlow designed with microservices instead of a monolith?
- **Short Answer:** Microservices decouple responsibilities: Next.js handles fast client rendering, Django/Daphne handles complex business logic and WebSockets, PostgreSQL manages relational state, and Redis provides low-latency broadcast pub/sub.
- **Expanded Explanation:** Decoupling enables independent fault isolation. If the Next.js frontend crashes, the backend ASGI server and database continue running. AutoHeal can remediate only the specific failing container without affecting the rest of the application.

### Q11: What is Daphne and why is it used instead of standard Gunicorn or WSGI?
- **Short Answer:** Daphne is an ASGI (Asynchronous Server Gateway Interface) server that supports both standard HTTP requests and long-lived asynchronous WebSocket connections, which MovieFlow requires for real-time synchronized playback and chat.
- **Expanded Explanation:** Traditional WSGI servers like Gunicorn are synchronous and block worker threads during long-lived WebSocket connections. Daphne, paired with Django Channels and Redis, allows thousands of concurrent WebSockets for virtual room synchronization.

### Q12: Where are persistent data stored across container lifecycles?
- **Short Answer:** Relational data are stored in a dedicated Docker volume named `multiflow_postgres_data`, Grafana dashboards in `multiflow_grafana_data`, Prometheus time-series in `multiflow_prometheus_data`, and AutoHeal incidents in `/data/autoheal.db`.
- **Expanded Explanation:** Because Docker containers are ephemeral, mounting named volumes ensures that stopping, recreating, or upgrading container images does not cause data loss.

---

## Category C: Monitoring

### Q13: What is Prometheus and how does it work?
- **Short Answer:** Prometheus is an open-source, time-series monitoring system and database that uses a pull-based scraping model to collect numeric metrics from instrumented targets over HTTP.
- **Expanded Explanation:** Prometheus polls configured targets (e.g., `:9100/metrics`, `:5001/metrics`) at defined intervals (15s in MovieFlow). It stores timestamps and key-value metric pairs in its local TSDB, evaluates alerting rules, and fires alerts to Alertmanager.

### Q14: What is the difference between pull-based and push-based monitoring?
- **Short Answer:** Pull-based monitoring (Prometheus) has the server actively poll targets at scheduled intervals; push-based monitoring requires agents or applications to push metrics out to a central server.
- **Expanded Explanation:** Pull-based monitoring allows the central server to detect immediately if a target is down (if scrape fails, `up == 0`). It prevents a broken application from overwhelming the monitoring system with push retries.

### Q15: What is a "Scrape Target"?
- **Short Answer:** A scrape target is an HTTP endpoint exposed by an application or exporter that outputs Prometheus-formatted metrics text when polled by Prometheus.
- **Expanded Explanation:** In MovieFlow AutoHeal, there are 8 active targets, including `node-exporter:9100`, `cadvisor:8080`, `autoheal:5001`, and `blackbox-exporter:9115`.

### Q16: What is the Blackbox Exporter and why is it essential?
- **Short Answer:** Blackbox Exporter performs external synthetic probing (HTTP, TCP, DNS) against application endpoints from the outside, verifying availability from a client perspective rather than relying on internal metrics.
- **Expanded Explanation:** An application process might appear running in Docker, but its HTTP event loop could be frozen. Blackbox actively sends HTTP GET requests to `/api/health` and `/api/core/health/`, recording true response status codes and network latency.

### Q17: What is the difference between Node Exporter and cAdvisor?
- **Short Answer:** Node Exporter collects host-level hardware and OS metrics (CPU, RAM, disk I/O), whereas cAdvisor collects container-specific cgroup metrics (container CPU throttle, container memory usage, container network Rx/Tx).
- **Expanded Explanation:** Node Exporter looks at the overall machine/VM; cAdvisor looks inside the Linux kernel cgroups for individual Docker containers.

### Q18: What does the metric `up` signify in Prometheus?
- **Short Answer:** The `up` metric is a binary gauge generated automatically by Prometheus on every scrape: `1` indicates the target responded successfully, and `0` indicates the scrape failed or timed out.
- **Expanded Explanation:** We use `up == 0` for our `MonitoringTargetDown` alert rule and `sum(up)` in Grafana to visualize total healthy targets (currently 8/8).

### Q19: Why does Blackbox Exporter use `probe_success` instead of `up`?
- **Short Answer:** `up` measures whether the Blackbox Exporter itself is reachable; `probe_success` measures whether the *target application endpoint* probed by Blackbox returned HTTP 200 OK.
- **Expanded Explanation:** If the Blackbox daemon is up, `up{job="blackbox-http"}` equals 1. But if the Django backend returns a 500 Internal Error, `probe_success` becomes 0, triggering the `BackendUnavailable` alert.

---

## Category D: Alerting

### Q20: What is an Alert Rule in Prometheus?
- **Short Answer:** An alert rule is a PromQL condition combined with a duration threshold (`for`) and metadata (labels and annotations) that instructs Prometheus when to fire an alert.
- **Expanded Explanation:** Example: `probe_success == 0` with `for: 30s` means the endpoint must fail continuously for 30 seconds before transitioning from `PENDING` to `FIRING`, preventing false alarms from momentary network blips.

### Q21: What is the difference between `PENDING` and `FIRING` alert states?
- **Short Answer:** `PENDING` means the alert condition is currently true but has not yet met the required `for` duration threshold; `FIRING` means the threshold has been satisfied and the alert is actively sent to Alertmanager.
- **Expanded Explanation:** If a probe fails for 10 seconds on a rule with `for: 30s`, it is `PENDING`. If the probe recovers at second 25, the alert disappears without ever reaching Alertmanager or AutoHeal.

### Q22: What role does Alertmanager play between Prometheus and AutoHeal?
- **Short Answer:** Alertmanager acts as an intelligent router: it deduplicates identical alerts, groups alerts arriving at the same time into a single notification, manages silence windows, and pushes JSON webhooks to AutoHeal.
- **Expanded Explanation:** If 5 containers fail simultaneously due to a network glitch, Alertmanager can group them into one batch payload rather than firing 5 separate webhooks simultaneously, preventing webhook storms.

### Q23: What is alert fingerprinting in Alertmanager?
- **Short Answer:** A fingerprint is a unique 64-bit cryptographic hash generated from the alert's label set that uniquely identifies an incident stream across its firing and resolved lifecycle.
- **Expanded Explanation:** AutoHeal uses this fingerprint (`fingerprint: "..."`) in SQLite to track deduplication, ensuring that repeated notifications for the same ongoing incident update the existing record rather than creating duplicate incidents.

### Q24: What happens when an alert transitions to `RESOLVED`?
- **Short Answer:** Prometheus detects the condition is no longer true and sends a resolved notification to Alertmanager, which notifies AutoHeal. AutoHeal marks the incident resolved with recommended action `no_action`.
- **Expanded Explanation:** This ensures closed-loop bookkeeping: AutoHeal updates the incident record in SQLite with a resolution timestamp, and the Grafana dashboard updates active firing alert counts back to 0.

### Q25: How did you test alert rules without crashing live services?
- **Short Answer:** We used unit tests with synthetic alert payloads that simulate Alertmanager JSON models, verifying that the classifier and decision engine behave correctly without needing physical failures.
- **Expanded Explanation:** In Phase 10 Stage 1, we executed `test_webhook.py` and `test_classifier.py` using FastAPI's `TestClient` to pass realistic synthetic payloads directly into the application in memory.

---

## Category E: Python and FastAPI

### Q26: Why was Python selected for the AutoHeal Engine?
- **Short Answer:** Python offers rapid development, robust standard libraries for process management and data handling, native integration with Ansible, and strong asynchronous web frameworks like FastAPI.
- **Expanded Explanation:** Python is the de facto standard in SRE and DevOps engineering. It easily interfaces with Docker SDK, SQLite, and Prometheus client libraries, and allows clean mathematical logic for cooldowns and circuit breakers.

### Q27: Why use FastAPI instead of Flask or Django for AutoHeal?
- **Short Answer:** FastAPI is modern, lightweight, asynchronous (ASGI), and features automatic request validation via Pydantic models with native OpenAPI documentation, making it significantly faster and safer for webhook ingestion.
- **Expanded Explanation:** FastAPI handles concurrent asynchronous webhook requests without blocking worker threads. Pydantic automatically validates JSON types and schemas, immediately returning HTTP 422 if an alert payload is malformed.

### Q28: How does the Alert Classifier work?
- **Short Answer:** The classifier inspects alert labels (e.g., `alertname`, `service`, `severity`), maps them against known pattern signatures, normalizes the service name, categorizes the incident, and computes a confidence score.
- **Expanded Explanation:** For example, an alert named `BackendUnavailable` is parsed into service `backend`, category `availability`, severity `critical`, with a confidence score of 0.95. Unregistered alerts are marked as service `unknown` with confidence 0.50.

### Q29: What is "Confidence Scoring" and why is it important?
- **Short Answer:** Confidence scoring is a numerical probability ($0.0$ to $1.0$) reflecting how certain the decision engine is that the recommended remediation matches the root cause.
- **Expanded Explanation:** AutoHeal enforces a threshold of $\ge 0.90$. If confidence is below 0.90 (such as for vague CPU resource warnings or unknown alerts), AutoHeal refuses to execute automated recovery and flags the incident for human SRE review.

### Q30: How does the SQLite incident store operate safely under concurrent requests?
- **Short Answer:** The SQLite database operates in Write-Ahead Logging (WAL) mode with `check_same_thread=False` and connection context managers, allowing concurrent readers without locking the writer.
- **Expanded Explanation:** WAL mode stores writes in a separate `.wal` file, preventing database lock contention between incoming webhooks and Prometheus `/metrics` queries.

### Q31: What endpoints does the AutoHeal REST API expose?
- **Short Answer:**
  - `POST /webhook/alerts`: Ingests Alertmanager alerts.
  - `GET /health`: Health and dry-run status.
  - `GET /status`: Incident statistics and uptime.
  - `GET /incidents`: Query historical incidents.
  - `GET /recovery/status`: Cooldowns and circuit breaker states.
  - `GET /recovery/history`: Execution history log.
  - `GET /metrics`: Prometheus telemetry metrics.
  - `POST /recovery/approve/{id}`: Manual operator approval gate.

---

## Category F: Ansible

### Q32: What is Ansible and why is it used here?
- **Short Answer:** Ansible is an open-source IT configuration and automation engine that executes tasks defined declaratively in YAML playbooks over SSH or container connections.
- **Expanded Explanation:** Instead of running opaque, unversioned bash scripts (`docker restart`), Ansible playbooks provide modular, auditable, structured tasks with pre-flight checks, conditional logic, and post-flight verification.

### Q33: What is "Idempotency" in Ansible?
- **Short Answer:** Idempotency is the property where an operation can be applied multiple times without changing the result beyond the initial application.
- **Expanded Explanation:** If an Ansible task ensures a container is started, running the playbook when the container is already healthy results in status `OK` without causing an unnecessary restart or disruption.

### Q34: What is Ansible "Check Mode" (`--check`)?
- **Short Answer:** Check mode is Ansible's dry-run simulation capability; it evaluates playbook syntax and tasks against inventory and reports what changes *would* occur without actually executing them.
- **Expanded Explanation:** AutoHeal passes `--check` to Ansible whenever `DRY_RUN=True`. This allows the platform to validate playbook paths and command logic in full without altering container states.

### Q35: How does AutoHeal invoke Ansible?
- **Short Answer:** AutoHeal uses a containerized runner architecture: it executes `docker run` to dispatch the `movieflow-ansible-runner:latest` container, mounting the playbooks and inventory into an isolated sandbox.
- **Expanded Explanation:** This isolates Ansible dependencies, Python versions, and execution environments completely from the AutoHeal daemon, preventing library conflicts.

### Q36: Describe the structure of `recover_backend.yml`.
- **Short Answer:** It has three tasks: 1) Verify `movieflow_backend` container exists; 2) Restart the container using the Docker community module; 3) Wait for port 8000 and assert HTTP 200 on `/api/core/health/`.
- **Expanded Explanation:** The playbook enforces post-restart health verification: it does not declare recovery complete simply because Docker restarted the container; it actively verifies that Django's ASGI health check returns 200 OK.

### Q37: Why are Ansible playbooks mapped server-side in `config.py`?
- **Short Answer:** Hard-coding the mapping in server configuration prevents malicious webhook injection attacks where an attacker might attempt to specify an arbitrary playbook path in alert annotations.
- **Expanded Explanation:** AutoHeal only recognizes fixed keys like `restart_backend` which map immutably to `playbooks/recover_backend.yml`. Injected command strings in labels are ignored.

---

## Category G: Safety and Reliability

### Q38: What is an Anti-Flap Cooldown Window?
- **Short Answer:** A cooldown is a mandatory quiet period (300 seconds) enforced after a recovery action during which subsequent alerts for that same service are suppressed from triggering additional restarts.
- **Expanded Explanation:** If a container fails due to an underlying bug (e.g., bad code or schema mismatch), restarting it will cause it to crash again immediately. Without a cooldown, the system would enter an infinite restart storm. The 300s window breaks the storm and records `SKIPPED_COOLDOWN`.

### Q39: What is a Circuit Breaker and how does it work in AutoHeal?
- **Short Answer:** A circuit breaker is a defensive pattern that halts automated operations after repeated failures; in AutoHeal, 3 consecutive failed recoveries trip the breaker from `CLOSED` to `OPEN` for 10 minutes.
- **Expanded Explanation:** While `CLOSED`, automated recoveries are permitted. If 3 attempts fail consecutively, it trips to `OPEN`. All incoming requests for that service are immediately blocked (`BLOCKED_CIRCUIT_BREAKER`), and an urgent manual operator alert is flagged.

### Q40: Why is PostgreSQL strictly forbidden from automated recovery?
- **Short Answer:** PostgreSQL is a stateful relational database; restarting a database ungracefully during active transactions risks write-ahead log (WAL) corruption, table locks, and split-brain states.
- **Expanded Explanation:** Stateless web frontends can be restarted freely because state lives elsewhere. Databases hold stateful integrity. Any database failure requires human DBA investigation. AutoHeal hard-codes PostgreSQL into `FORBIDDEN_SERVICES`.

### Q41: Why are monitoring components forbidden from automated recovery?
- **Short Answer:** If Prometheus or Alertmanager fails, having AutoHeal attempt automated recovery risks creating recursive monitoring feedback loops where the recovery action triggers further monitoring alerts.
- **Expanded Explanation:** If a monitoring stack is failing, the observability channel itself is untrusted. The platform blocks automated remediation on monitoring tools and alerts operators directly.

### Q42: What is `DRY_RUN` mode and why is it enabled?
- **Short Answer:** `DRY_RUN` mode evaluates all alert processing, classification, decision making, and Ansible check-mode execution, but simulates the actual container modification rather than killing live processes.
- **Expanded Explanation:** It allows the platform to be fully demonstrated and tested in academic and staging environments with 100% realistic telemetry without risking downtime or data loss on the active MovieFlow application.

### Q43: What is MTTR and how does self-healing affect it?
- **Short Answer:** MTTR stands for Mean Time to Recovery (the average time elapsed between failure inception and full restoration); self-healing reduces MTTR from 15–30 minutes to seconds by automating detection and remediation.
- **Expanded Explanation:** $\text{MTTR} = T_{\text{detect}} + T_{\text{triage}} + T_{\text{remediate}} + T_{\text{verify}}$. By automating triage and remediation, human latency ($T_{\text{triage}}$) is reduced to near zero.

### Q44: What security risk does mounting `/var/run/docker.sock` introduce?
- **Short Answer:** Mounting the Docker socket gives the container root-equivalent control over the host Docker daemon, meaning a compromised container could escape to the host OS.
- **Expanded Explanation:** This is a well-documented Docker security architectural trade-off. In production, AutoHeal should communicate with Docker over a rootless TCP proxy or use an isolated SSH bastion to restrict available Docker API endpoints.

---

## Category H: Testing

### Q45: What did you test in Phase 10?
- **Short Answer:** We evaluated the system in two stages: Stage 0 recorded a healthy live baseline across all 11 containers, and Stage 1 executed an isolated 43-assertion test suite covering classification, boundaries, cooldowns, circuit breakers, and timeouts.
- **Expanded Explanation:** We tested 10 specific evaluation categories using Pytest inside the container environment with mocked subprocess calls, temporary SQLite databases, and synthetic payloads, ensuring zero disruption to running services.

### Q46: What is the difference between unit testing and integration testing here?
- **Short Answer:** Unit tests evaluate individual functions in isolation (like `classifier.classify()` on a synthetic alert); integration tests evaluate multiple components interacting together (FastAPI webhook -> Decision Engine -> SQLite Store -> Cooldown).
- **Expanded Explanation:** In our suite, `test_classifier.py` is pure unit testing. `test_integration.py` and `test_webhook.py` are integration tests that verify data flow across models, stores, and HTTP endpoints.

### Q47: Why did you use mocks during testing?
- **Short Answer:** Mocks (`monkeypatch.setattr`) replace real subprocess execution (`docker run` / Ansible) with deterministic simulated responses, allowing us to test failure edge cases (like timeouts and non-zero exit codes) safely without crashing real containers.
- **Expanded Explanation:** To test how AutoHeal handles a subprocess timeout (exit code 124), we mock `subprocess.run` to raise `TimeoutExpired`. This proves the error handler works without having to freeze a physical system process.

### Q48: Why was real physical failure injection deferred?
- **Short Answer:** Real failure testing (Stage 2) was deferred to prevent accidental disruption to the active MovieFlow platform and protect persistent PostgreSQL databases, in strict accordance with project safety guidelines.
- **Expanded Explanation:** Academic and evaluation requirements mandated that Phase 10 prove correctness via safe simulation first. Controlled real failure injection requires dedicated maintenance windows and database backups.

### Q49: What do the 43 passing test assertions prove?
- **Short Answer:** They prove that the classification logic, confidence scoring, allowlist gating, forbidden database shields, cooldown anti-flapping, circuit breaker trip states, and webhook endpoints work correctly according to design specifications.
- **Expanded Explanation:** Every critical boundary and failure handling mechanism has automated regression coverage. If someone attempted to send an alert targeting `postgres`, the tests prove the code will reject it.

### Q50: How do you measure performance without real failures?
- **Short Answer:** We measured component execution latencies on synthetic alert objects in memory using high-precision timers (`time.perf_counter()`) across multiple iterations ($n=50$).
- **Expanded Explanation:** We benchmarked classifier latency (0.0025 ms), decision latency (0.12 ms), safety validation (0.0005 ms), and end-to-end TestClient webhook latency (19.21 ms). Real container restart times were explicitly not claimed.

---

## Category I: Grafana and Observability

### Q51: Why did you choose Grafana for visualization?
- **Short Answer:** Grafana is the industry-standard visualization platform for Prometheus; it supports dynamic PromQL querying, flexible panel layouts, alerting badges, and automated file-based dashboard provisioning.
- **Expanded Explanation:** Grafana allows us to build a single-pane-of-glass dashboard that bridges high-level executive health stats with low-level kernel cgroup metrics and self-healing engine telemetry.

### Q52: How many panels does your dashboard contain and how is it organized?
- **Short Answer:** The dashboard contains 44 panels organized into 8 logical rows: System Overview, Service Health, Infrastructure, Prometheus Targets, Alert Monitoring, AutoHeal Engine, Decision Flow, and Cooldown & Circuit Breaker.
- **Expanded Explanation:** Rows group related concepts logically. An operator can see the overall health banner and active alerts at the top, inspect specific probe latencies in the middle, and review AutoHeal circuit breaker states at the bottom.

### Q53: What does the prominent blue banner on the dashboard indicate?
- **Short Answer:** It displays `DRY-RUN / SIMULATED (AUTO_RECOVERY: OFF)` to clearly communicate to operators and examiners that the platform is currently operating in simulation mode and will not execute destructive restarts.
- **Expanded Explanation:** In SRE dashboards, transparency of automation state is vital. An operator must know immediately whether automated remediation is active or simulated.

### Q54: What does "8/8 Prometheus Targets UP" mean?
- **Short Answer:** It means all 8 configured scrape jobs in Prometheus are actively reachable, responding to HTTP health checks, and returning valid metrics without errors.
- **Expanded Explanation:** If any exporter (e.g., cAdvisor or AutoHeal) crashed, the count would drop to 7/8, a red indicator would trigger, and Prometheus would fire a `MonitoringTargetDown` alert.

### Q55: How does Grafana hot-reload dashboard changes without restarting?
- **Short Answer:** Grafana's file dashboard provider (`dashboard_provider.yml`) is configured with `updateIntervalSeconds: 15`, which polls `/var/lib/grafana/dashboards` every 15 seconds and automatically updates the UI in memory.
- **Expanded Explanation:** This allows zero-downtime dashboard updates: when we updated `movieflow_infrastructure.json`, Grafana picked up the new 44-panel layout within 15 seconds without restarting the container.

### Q56: What are the current observability limitations of the dashboard?
- **Short Answer:** 1) Remaining cooldown seconds is not yet an expiring countdown gauge (only total skips are counted); 2) Pre-trip circuit breaker failure counts (1/3, 2/3) are not exposed as a metric; 3) DB metrics are inferred from the core API probe rather than dedicated exporter sidecars.
- **Expanded Explanation:** These are tracked in our Phase 10 evaluation report as future observability enhancements.

---

## Category J: Future Work and Production Hardening

### Q57: How would you deploy this in a production Kubernetes environment?
- **Short Answer:** We would translate Docker Compose services into Kubernetes Deployments and StatefulSets, replace Blackbox with native Kubernetes Liveness/Readiness probes, and package the AutoHeal engine as a custom Kubernetes Operator or CRD controller.
- **Expanded Explanation:** Kubernetes provides built-in pod restarting via the Kubelet. AutoHeal would operate at a higher level—managing multi-pod cascading failures, custom circuit breaking across services, and integration with service mesh telemetry like Istio.

### Q58: How would you secure the AutoHeal webhook in production?
- **Short Answer:** We would implement mutual TLS (mTLS) between Alertmanager and AutoHeal, require an HTTP Bearer authorization token, and validate incoming payload authenticity using HMAC-SHA256 request signatures.
- **Expanded Explanation:** This prevents unauthorized containers or attackers on the internal network from forging fake alerts to trigger denial-of-service restart cycles.

### Q59: How would you scale AutoHeal to handle hundreds of microservices?
- **Short Answer:** We would migrate the in-memory cooldown and circuit breaker states to a distributed Redis cluster, run multiple AutoHeal Uvicorn worker replicas behind a load balancer, and back incident storage with a managed PostgreSQL database.
- **Expanded Explanation:** In-memory state tracking only works for a single daemon process. Clustered Redis keys with atomic TTL expirations ensure that multiple AutoHeal worker nodes maintain synchronized cooldowns and circuit breakers.

### Q60: How would you improve database observability in future phases?
- **Short Answer:** We would deploy dedicated Prometheus database exporters: `postgres_exporter` for PostgreSQL and `redis_exporter` for Redis.
- **Expanded Explanation:** Dedicated exporters provide deep database metrics: active connection pool utilization, query latency percentiles, buffer cache hit ratios, deadlocks, and replication lag.

### Q61: What is the proposed protocol for Stage 2 Controlled Real-Failure Testing?
- **Short Answer:** Under a scheduled maintenance window with database backups, we would pause non-critical containers (like `movieflow_frontend`), enable `EXECUTION_MODE=AUTO_RECOVERY` for 15 minutes, and observe real Blackbox failure detection, Ansible execution, container unpausing, and real MTTR.
- **Expanded Explanation:** We would test Frontend failure, Daphne process termination, and assert that attempting to inject failure into PostgreSQL strictly skips recovery and alerts human operators.

### Q62: What is the single most important lesson learned from building MovieFlow AutoHeal?
- **Short Answer:** Automated self-healing is fundamentally an exercise in defensive boundary design; executing recovery is technically easy, but ensuring that automation knows *when NOT to act* (guarding databases, enforcing cooldowns, and tripping circuit breakers) is what makes a self-healing system safe.
- **Expanded Explanation:** Without rigorous safety invariants, automated recovery causes more outages than it solves. Building robust classification, permanent database shielding, and complete visual observability is what transforms a simple restart script into an enterprise-grade reliability platform.
