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

Local and CI evals protect predefined intents. Production is unpredictable. Close the EDD loop by using the **same attribute schema** for agent spans and eval datasets - so yesterday's incident becomes tomorrow's passing case.

## Mechanisms

1. **Standardized span emitting** - `emitAgentSpan` records prompt, routing confidence, JSON tool payload, latency, and tokens (`kit.*` attributes). Sample span: [evals/edd/examples/otel-agent-loop.json](../evals/edd/examples/otel-agent-loop.json). Export to an OTLP collector with `kitSpanToOtlpJson` when you already run one.
2. **Asynchronous shadow evals** - Do not judge every live prompt inline. Sample with `shouldShadowEval(0.05)` / `kit eval shadow --infile … --sample 0.05`. Example corpus: [evals/edd/examples/prod-turns.jsonl](../evals/edd/examples/prod-turns.jsonl).
3. **Prod → JSONL** - On unhandled tool exceptions, circuit-breaker trips, user downvotes, or `shadow_fail`, use `productionTraceToJsonl` / `kit eval dataset from-trace`. Example input: [evals/edd/examples/prod-trace.json](../evals/edd/examples/prod-trace.json); catalog case `prod-cb-01` in `architecture_terminal.jsonl`.
4. **Trajectory parity** - Multi-step failures should preserve ordered tool calls in history so `plan_adherence` / trajectory reports can name the failing step after promotion.
5. **Routing drift detection** - Compare tool-share distributions with `detectRoutingDrift`. Alert when e.g. `read_architecture_yaml` drops from ~30% to ~2% traffic.

## Try the closed loop locally

```bash
kit eval shadow --infile evals/edd/examples/prod-turns.jsonl --sample 1 --seed 1 --out out/shadow-fails.jsonl
kit eval dataset from-trace --trace evals/edd/examples/prod-trace.json --out out/prod.jsonl
```

Fixtures: [examples/otel-agent-loop.json](../evals/edd/examples/otel-agent-loop.json), [examples/prod-turns.jsonl](../evals/edd/examples/prod-turns.jsonl), [examples/prod-trace.json](../evals/edd/examples/prod-trace.json).

## Dashboard signals

| Signal | Alert when | Where |
|--------|------------|--------|
| Routing accuracy (shadow) | Below CI threshold (default 95%) | Shadow job / `kit.passed` on sampled spans |
| Hallucination rate (judge) | Sustained rise vs baseline week | Shadow fails tagged `shadow_fail` |
| Circuit-breaker trips | Spike vs 7-day baseline | Spans / cases with `circuit_breaker` |
| Tool share drift | Absolute drop ≥ 20 pp | Aggregate `kit.tool_name` → `detectRoutingDrift` |
| Safety suite | Scripted gate or nightly live fails | CI |

Filter production spans / turns by attributes `kit.case_id`, `kit.tool_name`, `kit.passed` (and `service.name=kit-edd` when using OTLP).

## Closed loop

```mermaid
flowchart LR
  prod[Prod agent.loop spans] --> shadow[kit eval shadow]
  shadow -->|shadow_fail| jsonl[evals JSONL]
  miss[Circuit breaker / downvote] --> fromTrace[from-trace]
  fromTrace --> jsonl
  jsonl --> ci[kit eval run / ci]
  ci -->|green| ship[Ship]
```

Yesterday's incident → JSONL (`from-trace` or shadow `--out`) → `kit eval run` → green before release. Keep prod-derived cases tagged `prod-derived`. Redact secrets from uploaded eval reports (harness redacts API-key-like strings in Markdown artifacts).
