import threading
from typing import Dict, Tuple

class MetricsRegistry:
    """Thread-safe, lightweight Prometheus metric collector and text formatter."""

    def __init__(self):
        self._lock = threading.Lock()
        # Counters: (name, label_tuple) -> count
        self._counters: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], float] = {}
        # Gauges: (name, label_tuple) -> value
        self._gauges: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], float] = {}

    def inc_counter(self, name: str, labels: Dict[str, str], value: float = 1.0):
        label_tuple = tuple(sorted(labels.items()))
        with self._lock:
            key = (name, label_tuple)
            self._counters[key] = self._counters.get(key, 0.0) + value

    def set_gauge(self, name: str, labels: Dict[str, str], value: float):
        label_tuple = tuple(sorted(labels.items()))
        with self._lock:
            key = (name, label_tuple)
            self._gauges[key] = value

    def generate_prometheus_text(self) -> str:
        lines = []

        # HELP and TYPE definitions
        lines.append("# HELP autoheal_recovery_attempts_total Total recovery attempts initiated by AutoHeal")
        lines.append("# TYPE autoheal_recovery_attempts_total counter")
        lines.append("# HELP autoheal_recovery_success_total Total successful recoveries verified by AutoHeal")
        lines.append("# TYPE autoheal_recovery_success_total counter")
        lines.append("# HELP autoheal_recovery_failure_total Total failed recoveries in AutoHeal")
        lines.append("# TYPE autoheal_recovery_failure_total counter")
        lines.append("# HELP autoheal_recovery_simulated_total Total simulated/dry-run recoveries in AutoHeal")
        lines.append("# TYPE autoheal_recovery_simulated_total counter")
        lines.append("# HELP autoheal_cooldown_skips_total Total recoveries skipped due to active cooldown")
        lines.append("# TYPE autoheal_cooldown_skips_total counter")
        lines.append("# HELP autoheal_circuit_breaker_tripped Circuit breaker state (1=tripped/open, 0=closed)")
        lines.append("# TYPE autoheal_circuit_breaker_tripped gauge")
        lines.append("# HELP autoheal_pending_approvals Total recoveries pending manual operator approval")
        lines.append("# TYPE autoheal_pending_approvals gauge")
        lines.append("# HELP autoheal_recovery_duration_seconds Last observed recovery execution duration")
        lines.append("# TYPE autoheal_recovery_duration_seconds gauge")

        with self._lock:
            for (name, label_tuple), val in sorted(self._counters.items()):
                label_str = ",".join(f'{k}="{v}"' for k, v in label_tuple)
                if label_str:
                    lines.append(f"{name}{{{label_str}}} {val}")
                else:
                    lines.append(f"{name} {val}")

            for (name, label_tuple), val in sorted(self._gauges.items()):
                label_str = ",".join(f'{k}="{v}"' for k, v in label_tuple)
                if label_str:
                    lines.append(f"{name}{{{label_str}}} {val}")
                else:
                    lines.append(f"{name} {val}")

        lines.append("") # Trailing newline
        return "\n".join(lines)

metrics_registry = MetricsRegistry()