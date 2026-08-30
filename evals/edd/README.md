# Eval-Driven Development (EDD) suites

Declarative agent evaluation harness for the Agent Lifecycle Kit.

## Layout

```text
evals/edd/
├── README.md
├── system_prompt.md
├── architecture_routing.yaml          # YAML harness
├── architecture_routing.jsonl         # Streaming dataset
├── architecture_self_correction.yaml
├── architecture_self_correction.jsonl
├── architecture_terminal.yaml
├── architecture_terminal.jsonl
└── tools/
    └── read_architecture_yaml.json    # MCP-shaped tool contract
```

## Quick start

```bash
# Offline / CI (deterministic scripted driver)
kit eval run --suite evals/edd/architecture_routing.yaml --model scripted

# CI gate (fail if routing accuracy < 95%)
kit eval ci --suite evals/edd/architecture_routing.yaml --threshold-routing 95 --out out/reports

# Markdown report for PRs / product review
kit eval report --format md --out out/reports

# Watch prompts + tool schemas
kit eval watch --suite evals/edd/architecture_routing.yaml --target evals/edd
```

`agent-kit` is an alias for `kit`.

## Metrics

| Type | What it asserts |
|------|-----------------|
| `tool_selection` | Correct tool (or `expect.no_tool`) |
| `schema_match` | Tool arguments are valid JSON (optional key checks) |
| `llm_as_judge` | Semantic accuracy / hallucination / tone |
| `self_correction` | Agent updates params after injected errors |
| `terminal_fallback` | Circuit breaker stops endless retries |

Live models: set `KIT_EVAL_API_KEY` / `OPENAI_API_KEY` and `--model <name>`. Optional `KIT_EVAL_BASE_URL` for Ollama or other OpenAI-compatible endpoints.

See [SOPs/eval-driven-development.md](../../SOPs/eval-driven-development.md).
