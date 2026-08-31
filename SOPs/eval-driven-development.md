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

**Default:** When changing agent prompts, MCP tool schemas, or routing behavior, use EDD - not ad-hoc playground checks. Companion: [docs/edd.md](../docs/edd.md), [evals/edd/README.md](../evals/edd/README.md).

## Loop (red → green → refactor)

1. **Red  -  Define intent:** Add a JSONL case (`id`, `prompt`, optional `history` / `tags` / `expect`) and point a YAML suite at it with metrics (`tool_selection`, `schema_match`, `argument_correctness`, `task_completion`, `criteria_judge`, `mcp_use`, `plan_adherence`, `step_efficiency`, `plugin`, `llm_as_judge`, `self_correction`, `terminal_fallback`).
2. **Green  -  Implement interface:** Register the tool contract (MCP JSON under `evals/edd/tools/` or suite `mcp_tools`) and system prompt. Run `kit eval run --suite … --model scripted` (or a live model).
3. **Refactor  -  Refine context:** Iterate tool `description` / parameter hints / system prompt until routing and schema assertions pass without hallucinated parameters.

## CLI

| Command | Purpose |
|---------|---------|
| `kit eval run --suite <path> --model <name>` | Execute one suite |
| `kit eval watch --suite <path> --target <file>` | Re-run on prompt / tool schema changes |
| `kit eval report --format md\|json --out <dir>` | Markdown or JSON cost/latency/failure report |
| `kit eval ci --threshold-routing 95 --out out/reports` | Headless gate; fail if routing accuracy &lt; threshold |
| `kit eval dataset lint\|dedupe\|synthesize\|from-trace` | Dataset hygiene (schema lint, dedupe, paraphrases, prod promote) |

`agent-kit` is an alias of `kit`.

## IDEs vs live keys

Cursor and GitHub Copilot already load Kit via `.cursorrules` and `.github/copilot-instructions.md`. Run evals with `--model scripted`; no provider key. Live evals POST to an OpenAI-compatible `/chat/completions` and do **not** call Cursor Chat or Copilot Chat. Key order, nightly vs PR, and a local live example: [docs/edd.md](../docs/edd.md#cursor-copilot-and-api-keys).

## CI

- **Scripted gate:** [`.github/workflows/agent-evals.yml`](../.github/workflows/agent-evals.yml) and `kit eval ci` / `kit check` use the keyword driver. Cases tagged `requires-live` are skipped so paraphrases do not fail CI. PR jobs may inject provider secrets but still default `KIT_EVAL_MODEL` to `scripted`.
- **Live nightly:** [`.github/workflows/edd-live.yml`](../.github/workflows/edd-live.yml) runs on a schedule when `KIT_EVAL_API_KEY` is set and `KIT_EVAL_MODEL` is a real provider model. That job includes `requires-live` rows. Missing `KIT_EVAL_API_KEY` skips the job; it does not fall through to `OPENAI_API_KEY`.
- **Threshold gating:** `--threshold-routing 95` blocks merges when routing/schema extraction fails more than 5% of routing-tagged cases.
- **Artifacts:** Reports upload with `if: always()` (`out/reports/eval-report.md`, `edd-report.md` / `.json`).

## Reports

`kit eval report` emits overall pass rate, token/latency cost, routing + schema adherence, and **failure traces** (expected vs actual tool/args, diagnosis, suggested fix). Example: [evals/edd/examples/eval-report.md](../evals/edd/examples/eval-report.md).

## Production bridge

Live spans share eval field names. Hard failures convert to JSONL via `productionTraceToJsonl`. Shadow evals sample ~5% of production traffic. See [SOPs/edd-production-telemetry.md](./edd-production-telemetry.md).
