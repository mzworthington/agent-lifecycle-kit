# Agent Lifecycle Kit v1.0.0 — EDD

**Eval-Driven Development is now first-class in Kit:** the sensible default for proving tool-using agent behavior before you ship.

## What shipped

- **YAML + JSONL harness** — Metrics: `tool_selection`, `schema_match`, `llm_as_judge`, `self_correction`, `terminal_fallback`
- **CLI** (`kit` / `agent-kit`): `eval run` · `eval watch` · `eval ci --threshold-routing` · `eval report`
- **CI** — Path-filtered workflow, threshold gates, report artifacts (`if: always()`)
- **Telemetry** — OTel spans, prod→JSONL, shadow sampling, routing-drift detection

## Docs

- [EDD guide](./edd.md) · [SOP](../SOPs/eval-driven-development.md) · [Production telemetry](../SOPs/edd-production-telemetry.md)
- [Blog](./blog/moving-beyond-vibes-edd.md) · [Suites](../evals/edd/README.md)
