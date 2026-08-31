# Kit (Agent Lifecycle Kit)

**Test the tools your agents call.**

When an LLM calls MCP tools, APIs, or terminals, failures are probabilistic: wrong tool, hallucinated args, endless retries. Kit ships **Eval-Driven Development (EDD)** — TDD for tool-using agents — plus the lifecycle, thin context budget, and MCP compose your team needs to run that loop every day.

[![CI](https://img.shields.io/badge/CI-Passing-brightgreen?style=for-the-badge&logo=github-actions)](./.github/workflows/ci.yml)
[![EDD](https://img.shields.io/badge/EDD-Harness-blueviolet?style=for-the-badge&logo=target)](./docs/edd.md)
[![Pages](https://img.shields.io/badge/Docs-eval--driven--development.dev-blue?style=for-the-badge&logo=github)](https://eval-driven-development.dev/)
[![License](https://img.shields.io/badge/License-Unlicense-success?style=for-the-badge)](./LICENSE)

---

## What do I use this for today?

| Job in front of you | Do this |
| :--- | :--- |
| Agent picked the wrong tool / made-up args | Write a JSONL case → `kit eval run --suite evals/edd/architecture_routing.yaml --model scripted` |
| Gate a prompt or schema change | `kit eval ci --threshold-routing 95 --out out/reports` |
| Always-on rules are too fat | `kit measure-context` then `kit check` |
| Starting a product feature | Orchestrator lifecycle (grill → spec → TDD + XFN → audit → release) |
| Never installed kit | [First session on the site](https://eval-driven-development.dev/#onboard) |

Interactive picker + failing-eval demo: [eval-driven-development.dev](https://eval-driven-development.dev/#today).

---

## The value: Eval-Driven Development

**EDD is TDD for agents.** Treat prompts and tool schemas as version-controlled contracts:

1. **Red** — Write a failing eval (JSONL intent + YAML metrics) for the routing or schema you care about.
2. **Green** — Register the MCP/tool contract and system prompt; run until asserts pass.
3. **Refactor** — Tighten descriptions and constraints; gate merges with `kit eval ci --threshold-routing 95`.

```bash
kit eval run --suite evals/edd/architecture_routing.yaml --model scripted
kit eval ci --threshold-routing 95 --out out/reports
kit eval report --format md --out out/reports
```

| | |
| :--- | :--- |
| **Why** | [docs/edd.md](./docs/edd.md) |
| **How** | [SOPs/eval-driven-development.md](./SOPs/eval-driven-development.md) |
| **Suites** | [evals/edd/README.md](./evals/edd/README.md) |
| **Site** | [eval-driven-development.dev](https://eval-driven-development.dev/) |

Context isolation · mocked tools · schema match + LLM-as-a-judge · CI gates · prod→JSONL closed loop.

---

## What else Kit gives you

EDD is the agent default. Around it, Kit standardizes how coding agents work across Cursor, Claude Code, Gemini CLI, Windsurf, and Copilot:

| Pillar | Outcome |
| :--- | :--- |
| **Architecture** | Hexagonal + DDD + vertical slices + clean code ([CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md)) |
| **Lifecycle skills** | Spec → TDD short loop → XFN → security → release via `agent-*` roles |
| **One rules file** | `AGENTS.md` syncs to every IDE entry point |
| **MCP catalog** | Composable profiles into `.cursor/mcp.json` ([mcps/](./mcps/)) |
| **Context budget** | Always-on bootstrap under ~8KB; `kit measure-context` / `kit check` ([docs/kit.md](./docs/kit.md)) |
| **Security audit** | Prompt injection, secrets, entropy, unpinned skills (`kit audit`) |

```mermaid
flowchart LR
  intent[Agent intent] --> edd[EDD red / green / refactor]
  edd --> ci[CI threshold gate]
  ci --> ship[Ship]
  ship --> prod[Prod OTel + shadow judge]
  prod -->|miss| edd
```

Feature work still follows the orchestrator: Grilling → Spec → TDD + XFN → Audit → Telemetry → Release ([agent-orchestrator](./skills/agent-orchestrator/SKILL.md)).

```mermaid
sequenceDiagram
  autonumber
  participant O as agent-orchestrator
  participant G as agent-grilling
  participant S as agent-spec
  participant T as agent-tdd
  participant X as agent-xfn
  participant Sec as agent-security
  participant Arch as agent-arch-drift
  participant Tel as agent-telemetry
  participant R as agent-release

  O->>G: Stress-test idea and decision frontier
  O->>S: BDD spec and acceptance criteria
  O->>T: Inventory catalog and plan test impact
  O->>X: Cross-functional quality matrix
  O->>T: TDD short loop (gear 1 + gear 2)
  O->>X: Green apply-row XFN suites
  O->>Sec: Security and OWASP audit
  O->>Arch: Hexagonal boundaries, no drift
  O->>Tel: Map SLOs to OpenTelemetry
  O->>R: Conventional PR title and handover
```

---

## Quick start

```bash
# Put kit on your PATH (macOS / Linux; needs git and Node 22+)
curl -fsSL https://raw.githubusercontent.com/mzworthington/agent-lifecycle-kit/main/install.sh | sh

# Bootstrap the repo you are in
kit init . --mcp default --hook

# Prove agent tool-routing locally (offline scripted driver)
kit eval ci --threshold-routing 95 --model scripted --out out/reports
```

Already cloned this repo? Run `./install.sh` from the checkout instead.

| Command | Purpose |
| :--- | :--- |
| `kit eval run\|watch\|report\|ci` | **EDD harness** — agent tool routing & schemas |
| `kit eval` | Skill-trigger harness (which specialist activates) |
| `kit init [dir]` | Bootstrap `AGENTS.md`, IDE rules, MCP, pre-commit |
| `kit mcp <profile>` | Compose MCP profiles |
| `kit audit` | Security & supply-chain audit |
| `kit validate` / `kit verify` | Eval schema + skills layout |
| `kit export-rules` | Sync `AGENTS.md` → IDE entry points |
| `kit sync` | Install upstream skills from the lockfile |
| `kit check` | Local quality gate (audit, evals, EDD CI, context budget) |
| `kit measure-context` | Always-on context budget |

---

## Docs map

Start with the path that matches what you’re trying to do:

1. **Prove agents** — [EDD guide](./docs/edd.md) → [EDD SOP](./SOPs/eval-driven-development.md) → [suites](./evals/edd/README.md)
2. **Architecture & bootstrap** — [Coding philosophy](./CODING_PHILOSOPHY.md) → [AGENTS.md](./AGENTS.md)
3. **Skills & MCP** — [skills/README.md](./skills/README.md) → [mcps/README.md](./mcps/README.md)
4. **Quality loops** — [Behavior catalog & XFN](./SOPs/behavior-catalog-and-xfn.md) → [Hypothesis-driven debug](./SOPs/hypothesis-driven-debug.md)
5. **Operators** — [What kit gives you](./docs/kit.md) → [Context budget](./SOPs/context-budget.md) → [MCP library](./SOPs/mcp-library.md)

Site: [eval-driven-development.dev](https://eval-driven-development.dev/) (`#kit` for context/MCP/check; [docs/kit.md](https://eval-driven-development.dev/docs/kit.md))

---

## This checkout

App repos only need `kit` on PATH. This table is for people changing Kit itself:

| Path | Role |
|------|------|
| `bin/kit`, `bin/kit.ts` | CLI on PATH and the argv router |
| `kit/src/` | Implementation and unit tests |
| `evals/` | Skill-trigger JSON suites and EDD YAML/JSONL |
| `skills/`, `mcps/` | Lifecycle skills and MCP catalog |

```bash
pnpm test          # kit/src unit tests + kit-knowledge
pnpm test:ci       # same + Markdown report at out/reports/unit-test-report.md (CI Summary)
pnpm typecheck     # also run by .husky/pre-commit
pnpm check         # tests, then kit check (audit, evals, EDD CI, context budget)
```

---

## License

[Unlicense](./LICENSE) (Public Domain).
