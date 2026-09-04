# Subagent allowlist

Iteration 0. This page is the human copy of [`skills/subagents.yaml`](https://github.com/mzworthington/waykit/blob/main/skills/subagents.yaml): which `agent-*` roles may later become Cursor subagent stubs, and which stay `SKILL.md`. Generators are not wired yet. Orchestrator launch and host install paths do not change here.

Cursor’s own guidance: use subagents for isolation, parallelism, and independent verification. Keep skills for one-shot playbooks. Waykit does not emit one agent per role. Stack profiles never become agents.

```mermaid
flowchart TB
  roles[kind role skills]
  roles --> yes{Isolation, audit, or multi-step phase?}
  yes -->|yes| agent[Allowlist for subagent stub]
  yes -->|no| skill[Stay SKILL.md]
  profiles[kind profile] --> skill
```

## Allowlist

| Band | Disposition | Skills |
|------|-------------|--------|
| Pilot isolation | generate-agent | `agent-debug`, `agent-xfn` |
| Readonly audit | generate-agent | `agent-review`, `agent-security`, `agent-arch-drift` |
| Sequential specialists | generate-agent | `agent-spec`, `agent-tdd` |
| Orchestrator | parent only | `agent-orchestrator` |

Every other `agent-*` role stays a skill, including `agent-adapter`. `lang-*`, `framework-*`, and `profile-*` are stay-skill, not generate-agent.

### TDD contract

Gear 1 (domain + mocked ports) and gear 2 (thin adapter + integration test) stay one agent: `agent-tdd`. `agent-adapter` stays the escape hatch when gear 2 is too large. Do not split those gears into two stubs.

### Kill

The generate-agent list is the pilot set above. If someone proposes adding a role, freeze if auto-delegation is worse than today's skill picker. Expanding this list is a kill, not a default.

## Out of scope (this iteration)

- Generating agent files
- Changing orchestrator launch behaviour
- Host install paths

Taxonomy: [skills/README.md](https://github.com/mzworthington/waykit/blob/main/skills/README.md). Decision: [ADR 0008](./ADRs/0008-subagent-allowlist.md). Feature path: [lifecycle](/docs/lifecycle).
