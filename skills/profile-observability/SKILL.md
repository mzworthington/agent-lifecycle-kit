---
name: profile-observability
description: >-
  Naming and placement rules for logs, metrics, and traces that feed
  agent-telemetry and XFN load SLOs. Use when instrumenting services or aligning
  runtime signals with catalogued performance thresholds.
kind: profile
phase: stack
triggers:
  - observability profile
  - metrics naming
  - tracing conventions
  - slo mapping
  - opentelemetry
depends-on:
  - agent-telemetry
tools:
  - read
  - write
disable-model-invocation: false
---
# Observability Profile

Complements [agent-telemetry](../agent-telemetry/SKILL.md).

- **Boundaries** - Instrument adapters and use-case edges; avoid tracing every private function.
- **Names** - Stable, low-cardinality metric/trace names; no raw user IDs in label values. Flag names are allowed as a low-cardinality label (`flag_name`, `flag_on`); never put audience emails in labels.
- **SLO link** - Metric and alert thresholds must match XFN load rows (or record N/A).
- **Experiment link** - A bet’s leading indicator is a named event matching the PRD; do not invent a second “success” metric.
- **Logs** - Structured fields; never log secrets or unnecessary PII.
- **Propagation** - Forward correlation/trace context across HTTP and async workers.
