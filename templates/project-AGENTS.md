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
| Cloudflare Web Analytics / RUM / beacon | `skills/agent-cloudflare-ops` (`wk mcp cloudflare-ops --project`, then `wk mcp restore --project`) |
| Warp Factory / PostHog | `wk mcp warp --install` / `skills/agent-posthog` (`wk mcp posthog --install`) |
| Prompt / MCP tool / routing change | `docs/edd.md` + EDD SOP (`wk eval run\|ci`) |
| Which model / host slug | `SOPs/model-routing.md` (`wk model resolve`) |
| Subagent vs skill | `docs/subagents.md` (`skills/subagents.yaml`, `SOPs/subagent-launch.md`; `KIT_SKILLS_ONLY` loads SKILL.md in the parent) |
| Landing copy / docs narrative | `skills/agent-copy` (+ `agent-ui` / `agent-docs` as needed) |
| Commit / Linear ticket | `SOPs/conventional-commits.md` + `SOPs/linear-ticket-workflow.md` |
| SOP / handover lookup | kit-knowledge MCP when installed |
| Durable project facts | memory MCP (glossary, SLOs, prefs - never secrets) |
| Linear backlog / user stories | `skills/agent-user-stories` |

For **bugs / failed jobs / live symptoms**, use `agent-debug`. Do not open the full feature lifecycle unless RCA needs a new capability.

For non-trivial **feature** work: inventory tests (functional + XFN), complete an XFN apply/skip matrix, then orchestrator routing (grill if unsettled → spec → TDD short loop → XFN → audit → release).
