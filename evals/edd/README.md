# Eval-Driven Development (EDD) suites

Suite reference for Kit’s agent eval harness. Day-to-day steps in [SOPs/eval-driven-development.md](../../SOPs/eval-driven-development.md). Companion: [SOPs/edd-production-telemetry.md](../../SOPs/edd-production-telemetry.md).

## Layout

```text
evals/edd/
├── README.md
├── system_prompt.md
├── kit_knowledge_prompt.md
├── examples/eval-report.md
├── examples/prod-trace.json
├── architecture_routing.yaml|.jsonl
├── architecture_self_correction.yaml|.jsonl
├── architecture_terminal.yaml|.jsonl
├── kit_knowledge.yaml|.jsonl
└── tools/*.json
```

## Drivers

| Driver | When | What it proves |
|--------|------|----------------|
| `scripted` (CI default) | `pnpm eval:edd`, PR CI | Harness, schema, keyword routing. **Not** a product LLM test. |
| Live model | Nightly [`.github/workflows/edd-live.yml`](../../.github/workflows/edd-live.yml) when `KIT_EVAL_API_KEY` is set | Paraphrases, prompt-injection, multi-tool sequences tagged `requires-live` |

Do not extend the scripted driver to pass `requires-live` cases. Add JSONL rows instead.

## Quick start

```bash
kit eval run --suite evals/edd/architecture_routing.yaml --model scripted
kit eval ci --suite evals/edd/kit_knowledge.yaml --threshold-routing 95 --model scripted --out out/reports
kit eval ci --suite evals/edd/architecture_routing.yaml --threshold-routing 95 --out out/reports
kit eval report --format md --out out/reports
kit eval watch --suite evals/edd/architecture_routing.yaml --target evals/edd
```

`agent-kit` aliases `kit`.

## Metrics

| Type | Asserts |
|------|---------|
| `tool_selection` | Correct tool, `expect.no_tool`, or ordered `expect.tools[]` |
| `schema_match` | Valid JSON args (optional key checks per call) |
| `llm_as_judge` | Semantic accuracy / hallucination / tone (skipped when `expect.no_tool`) |
| `self_correction` | Param updates after injected errors |
| `terminal_fallback` | Circuit breaker stops endless retries |

## Tags

| Tag | Meaning |
|-----|---------|
| `routing` | Counts toward routing accuracy |
| `requires-live` | Skipped when the scripted driver is in use |
| `prod-derived` | Converted from a production miss via `productionTraceToJsonl` |
| `prompt-injection` | Instruction-override attempts |

## Reports

| Artifact | Role |
|----------|------|
| `out/reports/eval-report.md` | Stable alias for PR review |
| `out/reports/edd-report.md` | Same Markdown body |
| `out/reports/edd-report.json` | Machine-readable results |

Includes pass rate, tokens/latency, routing + schema adherence, and failure traces. Example: [examples/eval-report.md](./examples/eval-report.md).

Live models: `KIT_EVAL_API_KEY` / `OPENAI_API_KEY`. Optional `KIT_EVAL_BASE_URL`, `KIT_EVAL_TOKEN_USD_PER_1K`, `KIT_EVAL_MODEL`.
