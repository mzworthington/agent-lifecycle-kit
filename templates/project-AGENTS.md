# Agent Handshake

Standards and lifecycle agents live in `~/.agents` ([Waykit](https://github.com/mzworthington/waykit)).

Start from `~/.agents/AGENTS.md` (thin index). **Do not** bulk-read philosophy, SOPs, or skills up front.

| Situation | Load |
|-----------|------|
| Any task | `~/.agents/AGENTS.md` invariants + phase table |
| Architecture / new structure | `CODING_PHILOSOPHY.md` (or kit-knowledge `get_philosophy_section`) |
| Feature lifecycle | `skills/agent-orchestrator` |
| Bug / CI / live symptom | `skills/agent-debug` (+ hypothesis-driven-debug SOP) |
| Product bet / PRD / flags | `skills/agent-prd` (+ hypothesis-driven-development SOP) |
| Cloudflare Web Analytics / RUM / beacon | `skills/agent-cloudflare-ops` (`wk mcp cloudflare-ops --install`) |
| Warp Factory tasks / factory onboard | `wk mcp warp --install` (OAuth; `warp-factory` MCP) |
| Prompt / MCP tool / routing change | `docs/edd.md` + EDD SOP (`wk eval run\|ci`) |
| Which model / host slug | `SOPs/model-routing.md` (`wk model resolve --skill … --host cursor\|claude\|copilot\|antigravity`) |
| Landing / marketing / AI-sounding copy | `skills/agent-copy` (+ `skills/agent-ui` if layout) |
| Docs narrative rewrite | `skills/agent-docs` **and** `skills/agent-copy` |
| Committing / opening a PR | `SOPs/conventional-commits.md` (skills/SOPs are `feat`/`fix`, not `docs`); `commit-msg` git hook |
| SOP / handover lookup | kit-knowledge MCP when installed |
| Durable project facts | memory MCP (glossary, SLOs, prefs - never secrets) |
| Linear backlog / user stories | `skills/agent-user-stories` (INVEST + AC; mermaid wireframes on UI; operator stories skip wireframe; hypothesis + flag notes on bets; linear MCP on `default`) |

For **bugs / failed jobs / live symptoms**, use `agent-debug` (reproduce → hypothesis board → proof). Do not open the full feature lifecycle unless RCA needs a new capability.

For non-trivial **feature** work, before coding:

1. Inventory related tests (functional + XFN) and align on **test-case impact**.
2. Complete an **XFN apply/skip matrix** (browser E2E, a11y, security, load) - light floor on bug-fixes when UI/auth/SLO is touched.
3. Follow orchestrator routing: **Grilling (if ambiguous/unsettled)** → PRD if **bet** → Stories → Spec → TDD impact → XFN plan → **TDD short loop (gear 1+2)** → XFN green → Audit → Telemetry → Release → confirm/kill + prune flags. Use `agent-adapter` only for large adapter deep-dives.
