---
title: Eval-Driven Development (EDD)
kind: sop
triggers:
  - edd
  - eval driven development
  - agent eval
  - llm as judge
  - eval watch
  - eval ci
  - routing accuracy
tools:
  - shell
  - read
  - write
---
# Standard Operating Procedure: Eval-Driven Development (EDD)

Use this when changing agent prompts, MCP tool schemas, or routing behavior. Companion to [evals/edd/README.md](../evals/edd/README.md) and the `kit eval` / `agent-kit eval` CLI.

## EDD loop (red → green → refactor)

1. **Red — Define intent:** Add a JSONL case (`id`, `prompt`, optional `history` / `tags` / `expect`) and point a YAML suite at it with metrics (`tool_selection`, `schema_match`, `llm_as_judge`, `self_correction`, `terminal_fallback`).
2. **Green — Implement interface:** Register the tool contract (MCP JSON under `evals/edd/tools/` or suite `mcp_tools`) and system prompt. Run `kit eval run --suite … --model scripted` (or a live model).
3. **Refactor — Refine context:** Iterate tool `description` / parameter hints / system prompt until routing and schema assertions pass without hallucinated parameters.

## CLI

| Command | Purpose |
|---------|---------|
| `kit eval run --suite <path> --model <name>` | Execute one suite |
| `kit eval watch --suite <path> --target <file>` | Re-run on prompt / tool schema changes |
| `kit eval report --format md\|json --out <dir>` | Markdown or JSON cost/latency/failure report |
| `kit eval ci --threshold-routing 95 --out out/reports` | Headless gate; fail if routing accuracy &lt; threshold |

`agent-kit` is an alias of `kit`.

## CI features

- **Path filtering:** [`.github/workflows/agent-evals.yml`](../.github/workflows/agent-evals.yml) runs only when EDD harness, suites, or CLI change.
- **Threshold gating:** `--threshold-routing 95` blocks merges when tool routing / schema extraction fails more than 5% of routing-tagged cases.
- **Artifact preservation:** Reports upload with `if: always()` so failures are debuggable from JSON/Markdown artifacts.

## Markdown reports

`kit eval report` emits actionable PR artifacts (`out/reports/eval-report.md`, plus `edd-report.md` / `edd-report.json`): overall pass rate, token/latency cost, routing + schema adherence, and **failure traces** (expected vs actual tool/args, LLM output, diagnosis, suggested fix). See [evals/edd/examples/eval-report.md](../evals/edd/examples/eval-report.md).

## Production telemetry bridge

Live spans share eval field names (`kit.prompt`, `kit.tool_name`, `kit.tool_payload`, `kit.routing_confidence`, `kit.latency_ms`, `kit.tokens`). Hard failures (tool exceptions, circuit-breaker trips, user downvotes) convert to JSONL via `productionTraceToJsonl`. Shadow evals sample ~5% of production traffic for `llm_as_judge`. Routing drift uses `detectRoutingDrift` against baseline tool-share distributions.

See [SOPs/edd-production-telemetry.md](./edd-production-telemetry.md).
