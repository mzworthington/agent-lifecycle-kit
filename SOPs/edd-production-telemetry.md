---
title: EDD production telemetry & continuous monitoring
kind: sop
triggers:
  - production telemetry
  - shadow eval
  - routing drift
  - otel agent
  - prod to jsonl
tools:
  - read
  - write
  - shell
---
# Standard Operating Procedure: EDD Production Telemetry

Local and CI evals protect predefined intents. Production is unpredictable. Kit bridges both by using the **same attribute schema** for OTel spans and eval datasets.

## Mechanisms

1. **Standardized trace emitting** — `AgentClient` / `emitAgentSpan` records prompt, routing confidence, JSON tool payload, latency, and tokens on every agentic loop.
2. **Asynchronous shadow evals** — Do not judge every live prompt inline. Stream logs to a queue; run `llm_as_judge` on a randomized ~5% sample (`shouldShadowEval(0.05)`).
3. **Prod → JSONL** — On unhandled tool exceptions, circuit-breaker trips, or user downvotes, extract history with `productionTraceToJsonl` and append to `evals/edd/*.jsonl`.
4. **Routing drift detection** — Compare tool-share distributions across versions with `detectRoutingDrift`. Alert when e.g. `read_architecture_yaml` drops from ~30% to ~2% traffic.

## Dashboard signals

| Signal | Alert when |
|--------|------------|
| Routing accuracy (shadow) | Below CI threshold (default 95%) |
| Hallucination rate (judge) | Sustained rise vs baseline week |
| Circuit-breaker trips | Spike vs 7-day baseline |
| Tool share drift | Absolute drop ≥ 20 percentage points |

## Closed loop

Yesterday’s incident → JSONL case → `kit eval run` → green before release. Keep prod-derived cases tagged `prod-derived`.
