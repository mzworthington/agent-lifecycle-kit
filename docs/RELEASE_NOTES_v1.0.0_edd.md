# Agent Lifecycle Kit v1.0.0 — EDD Release Notes

We are excited to announce the **v1.0.0** Eval-Driven Development harness for the Agent Lifecycle Kit: an end-to-end evaluation system designed for local-first testing, MCP server development, and CI/CD pipelines.

## Key features

- **Declarative YAML harness:** Define suites, metric targets (`tool_selection`, `schema_match`, `llm_as_judge`, `self_correction`, `terminal_fallback`), and mock responses in human-readable YAML.
- **Streaming dataset engine:** Native `.jsonl` support for semantic variations, historical turns, and error-recovery sequences.
- **Developer-centric CLI** (`kit` / `agent-kit`):
  - `eval run` — targeted suites across foundation models (or `scripted` offline driver)
  - `eval watch` — hot-reload on prompt / MCP tool schema changes
  - `eval ci` — headless execution with `--threshold-routing` gates
  - `eval report` — Markdown/JSON performance and cost breakdowns (`out/reports/eval-report.md`)
- **OpenTelemetry instrumentation:** Spans for token usage, latency, routing confidence, and payload capture; prod→JSONL closed loop; shadow eval sampling; routing-drift detection.
- **CI path filtering + artifact upload:** Runs only when harness/suites change; uploads reports with `if: always()` for debuggability.

## Docs

- [EDD SOP](../SOPs/eval-driven-development.md)
- [Production telemetry SOP](../SOPs/edd-production-telemetry.md)
- [Blog: Moving Beyond Vibes](./blog/moving-beyond-vibes-edd.md)
- [EDD suites](../evals/edd/README.md)
