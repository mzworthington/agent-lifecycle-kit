# Agent Handshake

Standards and lifecycle agents live in `~/.agents`.

Start from `~/.agents/AGENTS.md` (thin index). **Do not** bulk-read philosophy, SOPs, or skills up front.

| Situation | Load |
|-----------|------|
| Any task | `~/.agents/AGENTS.md` invariants + phase table |
| Architecture / new structure | `CODING_PHILOSOPHY.md` (or kit-knowledge `get_philosophy_section`) |
| Feature lifecycle | `skills/agent-orchestrator` |
| Bug / CI / live symptom | `skills/agent-debug` (+ hypothesis-driven-debug SOP) |
| Prompt / MCP tool / routing change | `docs/edd.md` + EDD SOP (`kit eval run\|ci`) |
| Landing / marketing / AI-sounding copy | `skills/agent-copy` (+ `skills/agent-ui` if layout) |
| Docs narrative rewrite | `skills/agent-docs` **and** `skills/agent-copy` |
| Committing / opening a PR | `SOPs/conventional-commits.md` |
| SOP / handover lookup | kit-knowledge MCP when installed |
| Durable project facts | memory MCP (glossary, SLOs, prefs — never secrets) |

For **bugs / failed jobs / live symptoms**, use `agent-debug` (reproduce → hypothesis board → proof). Do not open the full feature lifecycle unless RCA needs a new capability.

For non-trivial **feature** work, before coding:

1. Inventory related tests (functional + XFN) and align on **test-case impact**.
2. Complete an **XFN apply/skip matrix** (browser E2E, a11y, security, load) - light floor on bug-fixes when UI/auth/SLO is touched.
3. Follow orchestrator routing: **Grilling (if ambiguous/unsettled)** → Spec → TDD impact → XFN plan → **TDD short loop (gear 1+2)** → XFN green → Audit → Telemetry → Release. Use `agent-adapter` only for large adapter deep-dives.
