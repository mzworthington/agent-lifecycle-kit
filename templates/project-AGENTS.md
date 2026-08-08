# Agent Handshake

Standards and lifecycle agents live in `~/.agents`.

Before starting work, read:

- `~/.agents/AGENTS.md` - bootstrap and lifecycle routing
- `~/.agents/CODING_PHILOSOPHY.md` - hexagonal architecture, DDD, vertical slices, clean code
- `~/.agents/SOPs/behavior-catalog-and-xfn.md` - tests as behavior catalog; XFN matrix
- `~/.agents/SOPs/hypothesis-driven-debug.md` - bugs, CI failures, live-site RCA
- `~/.agents/SOPs/cloudflare-observability-and-diagnosis.md` - Workers observability + prod diagnosis when hosting on Cloudflare
- `~/.agents/mcps/README.md` - shared MCP catalog and profiles (optional project `.cursor/mcp.json`)
- `~/.agents/skills/agent-adr/SKILL.md` - sparse ADRs in `docs/ADRs/` (hard to reverse / off-norm only)
- `~/.agents/skills/agent-debug/SKILL.md` - when something is broken today

For **bugs / failed jobs / live symptoms**, use `agent-debug` (reproduce → hypothesis board → proof). Do not open the full feature lifecycle unless RCA needs a new capability.

For non-trivial **feature** work, before coding:

1. Inventory related tests (functional + XFN) and align on **test-case impact**.
2. Complete an **XFN apply/skip matrix** (browser E2E, a11y, security, load) - light floor on bug-fixes when UI/auth/SLO is touched.
3. Follow orchestrator routing: Spec → TDD → XFN plan → Impl → XFN green → Audit → Telemetry.
