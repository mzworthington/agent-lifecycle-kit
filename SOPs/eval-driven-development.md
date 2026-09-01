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
| `kit eval report --format md\|json --out <dir> [--github-summary]` | Markdown or JSON cost/latency/failure report; optional Actions job summary |
| `kit eval ci --threshold-routing 95 --out out/reports` | Headless gate; fail if routing accuracy &lt; threshold |
| `kit eval dataset lint\|dedupe\|synthesize\|from-trace` | Dataset hygiene (schema lint, dedupe, paraphrases, prod promote) |

`agent-kit` is an alias of `kit`.

## IDEs vs live keys

Cursor and GitHub Copilot already load Kit via `.cursorrules` and `.github/copilot-instructions.md`. Run evals with `--model scripted`; no provider key. Live evals POST to an OpenAI-compatible `/chat/completions` and do **not** call Cursor Chat or Copilot Chat. Key order, nightly vs PR, and a local live example: [docs/edd.md](../docs/edd.md#cursor-copilot-and-api-keys).

## CI

- **Scripted gate:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) **Verify** runs `kit check` / `kit eval ci` with the keyword driver. Cases tagged `requires-live` are skipped so paraphrases do not fail CI. `kit check` covers architecture routing, kit-knowledge, Cloudflare ops, safety, self-correction, and terminal-fallback suites.
- **Live nightly:** [`.github/workflows/edd-live.yml`](../.github/workflows/edd-live.yml) runs on a schedule when `KIT_EVAL_API_KEY` is set and `KIT_EVAL_MODEL` is a real provider model. That job includes `requires-live` rows. Missing `KIT_EVAL_API_KEY` skips the job; it does not fall through to `OPENAI_API_KEY`.
- **Threshold gating:** `--threshold-routing 95` blocks merges when routing/schema extraction fails more than 5% of routing-tagged cases.
- **Artifacts:** Reports upload with `if: always()` (`out/reports/eval-report.md`, `edd-report.md` / `.json`).
- **Job summaries:** CI workflows publish an overview table plus the full Markdown report to `$GITHUB_STEP_SUMMARY` (via `kit eval report --github-summary`, or automatically when `GITHUB_ACTIONS=true`). Open the workflow run → Summary to read pass rate, routing/schema, and failure traces without downloading artifacts. Unit tests use `pnpm test:ci`, which also writes `out/reports/unit-test-report.md` into that Summary.

## Reports

`kit eval report` emits overall pass rate, token/latency cost, routing + schema adherence, and **failure traces** (expected vs actual tool/args, diagnosis, suggested fix). Example: [evals/edd/examples/eval-report.md](../evals/edd/examples/eval-report.md).

Under GitHub Actions, the same Markdown is folded into the job summary so green/red checks carry meaning (what gated, which suites, metrics).

## Production bridge

Live spans share eval field names (`emitAgentSpan`). Hard failures convert to JSONL via `productionTraceToJsonl` / `kit eval dataset from-trace`. Shadow sample + judge: `kit eval shadow --infile … --sample 0.05`. See [SOPs/edd-production-telemetry.md](./edd-production-telemetry.md).

## IDE session → EDD (debug / lessons)

When a miss appears in the **current** Cursor/Copilot thread (wrong tool, bad args, prompt/schema drift), [agent-debug](../skills/agent-debug/SKILL.md) must promote a case from context — no user paste required — then red/green with `kit eval` ([hypothesis-driven-debug.md](./hypothesis-driven-debug.md) §11). Lessons that capture the same friction set **EDD case** + optional **Promote to** `evals/edd/*.jsonl` ([templates/lesson.md](../templates/lesson.md)). Other IDE threads remain invisible until reopened or exported.
