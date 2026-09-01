# Kit review backlog

Open findings from [kit-value-and-model-agnostic-review.md](./kit-value-and-model-agnostic-review.md) (refreshed 2026-09-01). Track work here; mark items done with a PR reference.

## P0 — honesty / prove-what-you-claim

| ID | Finding | Proposed action | Status |
|----|---------|-----------------|--------|
| R1 | Skill-trigger harness (`kit/src/run_evals.ts`) does not invoke a model and ignores `required_patterns` / `required_output_sections`; banner still says “Live Trigger Evaluation” | Either (a) assert declared fields via scripted/LLM output checks, or (b) rename harness + `kit check` copy to “skill registration / prompt hygiene” and stop implying live routing proof | **Open** |
| R2 | README (and similar) imply peer multi-IDE depth while MCP install and skill discovery are Cursor-first | Narrow copy to: canonical `AGENTS.md` + thin entry stubs; Cursor is the reference host for skills/MCP | **Partial** — light README honesty in the refresh PR; fuller pass on site/`llms.txt` still open |

## P1 — eval / CI proof

| ID | Finding | Proposed action | Status |
|----|---------|-----------------|--------|
| R3 | Merge gate is scripted-only; nightly live skips without `KIT_EVAL_API_KEY` | Keep scripted as default; document required secrets for live; optionally fail a scheduled job loudly when key missing in production kit repos | **Open** (docs clearer; ops still optional) |
| R4 | Live client is OpenAI-compatible only; `ANTHROPIC_API_KEY` as bearer is easy to misconfigure | Document gateways honestly; consider native Anthropic/Gemini adapters only if demand appears | **Open** |

## P2 — maintainability / adoption

| ID | Finding | Proposed action | Status |
|----|---------|-----------------|--------|
| R5 | Role skills over ~150-line kit-review budget (`agent-prune`, `agent-orchestrator`, `agent-debug`, `agent-copy`) | Move procedure back to SOPs; keep role skills as routers | **Open** |
| R6 | Several `lang-*` / `framework-*` skills are short checklists (~38–48 lines) | Cut unused profiles or deepen with evals + concrete anti-patterns (see `lang-typescript` direction) | **Open** |
| R7 | Full lifecycle ceremony is heavy for day-to-day coding | Keep shortcuts (debug route, light XFN); surface “minimal path” in README onboarding | **Open** |

## Done since Aug 30 draft (do not reopen without new evidence)

| ID | Finding | Resolution |
|----|---------|------------|
| D1 | Architecture stack felt non-optional / blocks adoption | Applicability & opt-out + seed ADRs (#36) |
| D2 | EDD closed-loop entirely aspirational | Suites/depth (#23), shadow/OTel path (#28–#30), skill coverage (#31), nightly live workflow |

## How to use

- Prefer small PRs that close one ID.
- Link the ID in the PR body (`Closes review backlog R1`).
- When closing an item, set **Status** to `Done (PR #N)` and leave one line of evidence.
