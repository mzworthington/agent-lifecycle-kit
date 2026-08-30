# Eval-Driven Development (EDD) suites

Suite reference for Kit’s agent eval harness. Start with *why* in [docs/edd.md](../../docs/edd.md); day-to-day steps in [SOPs/eval-driven-development.md](../../SOPs/eval-driven-development.md).

## Layout

```text
evals/edd/
├── README.md
├── system_prompt.md
├── examples/eval-report.md
├── architecture_routing.yaml|.jsonl
├── architecture_self_correction.yaml|.jsonl
├── architecture_terminal.yaml|.jsonl
└── tools/read_architecture_yaml.json
```

## Quick start

```bash
kit eval run --suite evals/edd/architecture_routing.yaml --model scripted
kit eval ci --suite evals/edd/architecture_routing.yaml --threshold-routing 95 --out out/reports
kit eval report --format md --out out/reports
kit eval watch --suite evals/edd/architecture_routing.yaml --target evals/edd
```

`agent-kit` aliases `kit`.

## Metrics

| Type | Asserts |
|------|---------|
| `tool_selection` | Correct tool (or `expect.no_tool`) |
| `schema_match` | Valid JSON args (optional key checks) |
| `llm_as_judge` | Semantic accuracy / hallucination / tone |
| `self_correction` | Param updates after injected errors |
| `terminal_fallback` | Circuit breaker stops endless retries |

## Reports

| Artifact | Role |
|----------|------|
| `out/reports/eval-report.md` | Stable alias for PR review |
| `out/reports/edd-report.md` | Same Markdown body |
| `out/reports/edd-report.json` | Machine-readable results |

Includes pass rate, tokens/latency, routing + schema adherence, and failure traces. Example: [examples/eval-report.md](./examples/eval-report.md).

Live models: `KIT_EVAL_API_KEY` / `OPENAI_API_KEY`. Optional `KIT_EVAL_BASE_URL`, `KIT_EVAL_TOKEN_USD_PER_1K`.
