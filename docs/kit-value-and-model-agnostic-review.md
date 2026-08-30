# Kit review: value and model-agnosticism

**Verdict:** Valuable for teams that already want hexagonal + DDD + TDD/XFN discipline and primarily run agents in Cursor (or another host that loads `AGENTS.md` + progressive skills). **Not model-agnostic in the strong sense**—content is mostly portable markdown; discovery, MCP install, skill format, and the live EDD driver are Cursor- and OpenAI-compatible-shaped. Marketing that implies equal multi-IDE / multi-model depth oversells the current surface.

---

## What this kit is

Agent Lifecycle Kit is a **governance + procedure pack** for coding agents, plus a small TypeScript CLI (`kit`) for bootstrap, MCP compose, security scan, and eval harnesses. Core ideas:

1. Thin always-on bootstrap (`AGENTS.md`) with on-demand skills/SOPs/philosophy.
2. Lifecycle roles (`agent-*`) and stack profiles (`lang-*` / `framework-*`).
3. Architecture invariants (hexagonal, DDD, vertical slices, clean code).
4. Eval-Driven Development for agent tool routing/schemas.
5. MCP profile catalog and multi-IDE *pointer* files.

Rough inventory (as reviewed): ~44 skills, ~12 SOPs, dual eval layers (`evals/suites` + `evals/edd`), MCP profiles, and install/init tooling.

---

## What it does well

### 1. Context budget is a real design principle

`AGENTS.md` as a thin index, “do not eager-read,” skill length budgets, one MCP profile per session, and `measure-context-budget.sh` attack the right failure mode: agents drowning in always-on rules. That alone is more valuable than most “rules dump” repos.

### 2. Lifecycle taxonomy is coherent

Phase → skill routing (grill → spec → TDD short loop → XFN → audit → telemetry → release), handovers, lessons → kit-review promotion, and “tests as behavior catalog” form a usable operating system for multi-session feature work. Orchestrator + specialist split is clearer than a single mega-prompt.

### 3. EDD names the right problem

Treating prompts and tool schemas as contracts, with mocked tools, routing asserts, CI thresholds, and a prod→JSONL story, is the correct response to probabilistic tool-use failures. The *shape* of `kit eval run|ci` (YAML metrics + JSONL cases) is sound engineering.

### 4. Architecture and quality floor are explicit

Hexagonal inward dependencies, catalog impact maps, and an XFN apply/skip matrix with skip rationales give agents something sharper than “write good code.” `agent-copy` pushing back on AI-template voice is a practical quality control many kits lack.

### 5. Supply-chain hygiene for skills/MCP

Layout verify (kit vs upstream), `external.lock.json`, skill security scan, secrets-out-of-repo MCP fragments, and Unlicense keep ownership boundaries clearer than vendoring every vendor skill into git.

### 6. Portable *content* layer

Philosophy, SOPs, and role procedures are mostly host-neutral markdown. `export-ide-rules` + thin `CLAUDE.md` / `GEMINI.md` / Windsurf / Copilot stubs correctly treat `AGENTS.md` as canonical. Content can travel; runtime discovery is the weak link (below).

---

## Where it falls short

### 1. Skill-trigger “evals” are mostly theater

`scripts/lib/run_evals.ts` does **not** invoke a model and does **not** assert `required_patterns`, `required_output_sections`, or real routing accuracy. It mainly checks that `target_skill` exists and has triggers, and that some forbidden strings are absent from the **prompt**. Co-located `eval.json` files look like behavior catalogs but CI cannot prove skill output quality. That undermines the “ship agents you can prove” claim for the lifecycle layer.

### 2. Default EDD CI is a scripted keyword driver

Default path uses `--model scripted`: a hand-tuned keyword mock wired to the architecture_* fixtures. Useful for harness self-test; **not** evidence that Claude, GPT, Gemini, or local models route correctly. Live path is OpenAI-compatible `/chat/completions` only. `ANTHROPIC_API_KEY` is accepted as a bearer fallback but still hits an OpenAI-shaped base URL—easy to misconfigure. LLM-as-judge has a parallel limitation (local keyword judge vs same OpenAI-compatible judge).

### 3. “Multi-IDE” is thin; Cursor owns discovery

Skills are Cursor Agent Skills (`skills/*/SKILL.md` frontmatter). MCP install targets `~/.cursor/mcp.json`. External skills lockfile sets `"agent": "cursor"`. Non-Cursor entry points are short pointers—they do **not** reproduce progressive skill discovery, `@`-invocation, or MCP compose for Claude Code / Gemini / Copilot / Windsurf with equal fidelity. README/llms.txt imply peer support; operational depth is Cursor-first.

### 4. Opinion stack is invariant, not optional

Hexagonal + DDD + vertical slices + clean code are always-on. That is valuable **if** the team shares that stack; it is a poor fit for CRUD apps, explorative prototypes, or teams with different architecture norms. The kit is practice-opinionated by design—not methodology-agnostic.

### 5. Process weight vs day-to-day coding

Full lifecycle (grilling, handovers, XFN matrices, memory MCP DoD, pre-commit gates) is heavy. Shortcuts exist (debug route, light XFN) but the default narrative still pushes multi-phase ceremony. Teams that want a light `AGENTS.md` + a few skills will feel overserved by 44 roles/profiles and overlapping SOPs.

### 6. Stack profiles are uneven

Several `framework-*` / `lang-*` skills are short checklists (~38–45 lines). Useful as reminders; thin as gold standards. Risk: breadth of “we cover Next/Nuxt/Spring/Quarkus/…” outruns depth and maintenance.

### 7. Skill length budget already slipping

Kit-review targets ~150 lines for role bodies; `agent-prune`, `agent-orchestrator`, `agent-debug`, `agent-copy` already exceed that. Progressive disclosure erodes if role skills re-absorb SOP content.

### 8. Closed-loop production EDD is aspirational

OTel / shadow-judge / prod→JSONL are documented; the working default for most users will remain scripted local suites. Without live-model CI and telemetry wiring, EDD stays a good local harness rather than a proven production loop.

### 9. Adoption friction

Node ≥22, pnpm, `tsx`, symlink `~/.agents`, Cursor MCP OAuth assumptions, and optional external skill sync are a non-trivial bootstrap. Value shows up after install discipline; first-hour experience is kit-shaped, not “drop one file in any agent.”

---

## Model-agnosticism (focused answer)

| Layer | Agnostic? | Notes |
|-------|-----------|--------|
| Philosophy / SOPs / role prose | **Mostly yes** | Markdown procedures; model-neutral instructions |
| Host discovery & MCP | **No** | Cursor skill format + `.cursor/mcp.json` dominate |
| Multi-IDE export | **Cosmetic** | Pointer files ≠ equal capability |
| Skill routing evals | **N/A** | No model in the loop |
| EDD live runner | **Weakly** | Any OpenAI-compatible endpoint (incl. some Ollama/proxy setups); not first-class Anthropic/Gemini native APIs |
| Default CI proof | **No** | Scripted driver; suite-specific keywords |

**Bottom line:** The kit is **model-agnostic at the documentation layer** and **provider-shaped (OpenAI-compatible) + Cursor-centric at the runtime layer**. It is not “bring any model / any agent host and get the same guarantees.”

---

## Value judgment

**Worth adopting when:**

- You run Cursor (or can map skills manually) and want shared team agent behavior.
- You already believe tests/catalogs and hexagonal boundaries matter.
- You build MCP/tool-using agents and need a red/green/refactor harness for routing.
- You want a maintainable rules surface (thin always-on + on-demand) rather than a giant system prompt.

**Weak fit when:**

- You need equal first-class support across Claude Code, Gemini CLI, Copilot, Windsurf, Aider, etc.
- You need eval CI that proves behavior across real models out of the box.
- You want architecture-flexible guidance (not hex/DDD/slices as law).
- You want a minimal prompt pack without lifecycle ceremony.

**Net:** High **concept and structure** value; medium **execution** value today; **model-agnostic** only if you mean “the prose does not hardcode one LLM vendor’s chat style.” For hosts and providers, Cursor + OpenAI-compatible are the real center of gravity.

---

## Highest-leverage improvements

1. Make skill evals real (or rename them): either LLM/scripted output checks against `required_patterns` / sections, or stop claiming “live trigger evaluation.”
2. Run EDD CI on at least one live model (or matrix) in addition to `scripted`; document Anthropic/Gemini via compatible proxies honestly.
3. Narrow multi-IDE claims to “canonical `AGENTS.md` + thin entry stubs”; invest in host-specific skill loaders only where users prove demand.
4. Cut or deepen thin stack profiles; enforce the 150-line role budget by moving procedure back to SOPs.
5. Make architecture invariants configurable for consumer repos (kit defaults vs project overrides) so opinion does not block adoption.

---

*Review stance: fresh-mind product/architecture assessment of the kit as shipped, not a PR diff review. Evidence drawn from `AGENTS.md`, `README.md`, skills taxonomy, `scripts/lib/run_evals.ts`, `scripts/lib/edd/agent-client.ts`, install/MCP paths, and eval suite layout.*
