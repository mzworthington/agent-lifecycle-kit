# Kit review backlog

Open findings from [kit-value-and-model-agnostic-review.md](./kit-value-and-model-agnostic-review.md) (refreshed 2026-09-01). Track work here; mark items done with a PR reference.

## P0: honesty / prove-what-you-claim

No open P0 items. R1 (rename) and R2 (Cursor-first copy) are in **Done** below. Remaining skill-trigger work is asserting `required_patterns` (product, not copy).

## P1: eval / CI proof

| ID | Finding | Proposed action | Status |
|----|---------|-----------------|--------|
| R3 | Merge gate is scripted-only; nightly live skips without `KIT_EVAL_API_KEY` | Keep scripted as default; document required secrets for live; optionally fail a scheduled job loudly when key missing in production kit repos | **Open** (docs clearer; ops still optional) |
| R4 | Live client is OpenAI-compatible only; `ANTHROPIC_API_KEY` as bearer is easy to misconfigure | Document gateways honestly; consider native Anthropic/Gemini adapters only if demand appears | **Open** |

## P2: maintainability / adoption

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
| R1 | “Live trigger” language for a non-model skill-registration check | Renamed CLI help + harness banner to skill-trigger / prompt hygiene. Harness still ignores `required_patterns`. |
| R2 | Multi-IDE peer-depth oversold | FAQ, `llms.txt`, EDD guide, and README: Cursor is the reference host; other IDEs get thin `AGENTS.md` stubs. |

## How to use

- Prefer small PRs that close one ID.
- Link the ID in the PR body (`Closes review backlog R1`).
- When closing an item, set **Status** to `Done (PR #N)` and leave one line of evidence.
