# Agent Handshake

Standards and lifecycle agents live in `~/.agents`.

Before starting work, read:

- `~/.agents/AGENTS.md` - bootstrap and lifecycle routing
- `~/.agents/CODING_PHILOSOPHY.md` - hexagonal architecture, DDD, vertical slices, clean code; Mermaid for diagrams (no ASCII art diagrams); conventional commits **and** PR titles
- `~/.agents/SOPs/behavior-catalog-and-xfn.md` - tests as behavior catalog; XFN matrix
- `~/.agents/SOPs/hypothesis-driven-debug.md` - bugs, CI failures, live-site RCA
- `~/.agents/SOPs/conventional-commits.md` - commit subjects and PR titles (`type(scope): description`; squash-and-merge)
- `~/.agents/mcps/README.md` - shared MCP catalog and profiles (optional project `.cursor/mcp.json`)
- `~/.agents/skills/agent-adr/SKILL.md` - sparse ADRs in `docs/ADRs/` (hard to reverse / off-norm only)
- `~/.agents/skills/agent-debug/SKILL.md` - when something is broken today
- `~/.agents/skills/agent-pre-commit/SKILL.md` - hook checks plus conventional commit/PR title gate
- `~/.agents/docs/edd.md` - **Eval-Driven Development (EDD)** when changing prompts, MCP tools, or agent routing
- `~/.agents/SOPs/eval-driven-development.md` - EDD red → green → refactor (`kit eval run|ci`)

For **bugs / failed jobs / live symptoms**, use `agent-debug` (reproduce → hypothesis board → proof). Do not open the full feature lifecycle unless RCA needs a new capability.

For non-trivial **feature** work, before coding:

1. Inventory related tests (functional + XFN) and align on **test-case impact**.
2. Complete an **XFN apply/skip matrix** (browser E2E, a11y, security, load) - light floor on bug-fixes when UI/auth/SLO is touched.
3. Follow orchestrator routing: **Grilling (if ambiguous/unsettled)** → Spec → TDD impact → XFN plan → **TDD short loop (gear 1+2)** → XFN green → Audit → Telemetry → Release. Use `agent-adapter` only for large adapter deep-dives.
