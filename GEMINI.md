# Agent Context & Environment Bootstrap

You are working in a workspace configured with modular architectural, language, and framework guardrails.

Do not commit code (`git commit`) or push code (`git push`) unless the user explicitly asks. The user will review and commit code changes manually.

Before starting any task, orient yourself using the guidelines below.

## 1. Context structure

All standards and lifecycle roles live under `.agents/` as Cursor-compatible skills in `skills/`:

| Category | Path | Purpose |
|----------|------|---------|
| Core guardrails | [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) | Hexagonal architecture, TDD/BDD, security |
| Orchestration | [agent-orchestrator](./skills/agent-orchestrator/SKILL.md) | Routes work across lifecycle phases |
| Lifecycle roles | [skills/agent-*](./skills/) | Spec, TDD, adapter, security, arch-drift, telemetry |
| Language profiles | [skills/lang-*](./skills/) | TypeScript, Java, .NET |
| Framework profiles | [skills/framework-*](./skills/) | Next.js, Nuxt, Spring Boot, Quarkus |
| Procedures | [SOPs/](./SOPs/), [tasks/](./tasks/) | Repeatable operational checklists |

See [skills/README.md](./skills/README.md) for the full taxonomy.

## 2. Bootstrapping instruction

1. **Read [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) first** to align on hexagonal patterns and quality guardrails.
2. **Detect the stack** from the user's codebase. Activate matching `lang-*` and `framework-*` skills.
3. **Follow the orchestrator** via [agent-orchestrator](./skills/agent-orchestrator/SKILL.md) for feature work: Analysis → TDD design → Implementation → Audit → Telemetry.

## 3. Dynamic specialist activation

When executing a lifecycle phase, assume the matching role skill:

| Phase | Skill |
|-------|-------|
| Requirements / specs | [agent-spec](./skills/agent-spec/SKILL.md) |
| Tests & contracts | [agent-tdd](./skills/agent-tdd/SKILL.md) |
| Adapters & infrastructure | [agent-adapter](./skills/agent-adapter/SKILL.md) |
| Security audit | [agent-security](./skills/agent-security/SKILL.md) |
| Architecture conformance | [agent-arch-drift](./skills/agent-arch-drift/SKILL.md) |
| Observability | [agent-telemetry](./skills/agent-telemetry/SKILL.md) |

Phase handovers are written locally under `~/.agents/handover/<project>/` (not into the project repo). See [templates/handover.md](./templates/handover.md).
