# Agent Handshake

Standards and lifecycle agents live in `~/.agents`.

Before starting work, read:

- `~/.agents/AGENTS.md` - bootstrap and lifecycle routing
- `~/.agents/CODING_PHILOSOPHY.md` - hexagonal architecture, DDD, vertical slices, clean code
- `~/.agents/SOPs/behavior-catalog-and-xfn.md` - tests as behavior catalog; XFN matrix

For non-trivial work, before coding:

1. Inventory related tests (functional + XFN) and align on **test-case impact**.
2. Complete an **XFN apply/skip matrix** (browser E2E, a11y, security, load) - light floor on bug-fixes when UI/auth/SLO is touched.
3. Follow orchestrator routing: Spec → TDD → XFN plan → Impl → XFN green → Audit → Telemetry.
