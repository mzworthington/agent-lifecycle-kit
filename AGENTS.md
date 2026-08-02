# Agent Bootstrap

Welcome, AI Agent! You are working in a workspace configured with modular architectural, language, and framework guardrails.

This repository **is** the `.agents` kit. Consumers typically symlink `~/.agents` to their clone (see `install.sh`). In app repos, use a thin handshake that points here: [templates/project-AGENTS.md](./templates/project-AGENTS.md).

Do not commit code (`git commit`) or push code (`git push`) unless the user explicitly asks. The user will review and commit code changes manually.

Before starting any task, orient yourself using the guidelines below.

## 1. Context structure

All standards and lifecycle roles live under `.agents/` as Cursor-compatible skills in `skills/`:

| Category | Path | Purpose |
|----------|------|---------|
| Core guardrails | [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) | Hexagonal architecture, DDD, vertical slices, clean code, TDD/BDD, security |
| Orchestration | [agent-orchestrator](./skills/agent-orchestrator/SKILL.md) | Routes work across lifecycle phases |
| Lifecycle roles | [skills/agent-*](./skills/) | Spec, TDD, XFN quality, adapter, security, arch-drift, telemetry |
| Language profiles | [skills/lang-*](./skills/) | TypeScript, Java, C# |
| Framework profiles | [skills/framework-*](./skills/) | Next.js, Nuxt, Spring Boot, Quarkus, .NET |
| Procedures | [SOPs/](./SOPs/), [tasks/](./tasks/) | Repeatable operational checklists |
| Templates | [templates/](./templates/) | Handover, lesson, and project handshake formats |
| Kit improvement | [lessons/](./lessons/), [tasks/kit-review.md](./tasks/kit-review.md) | Local lesson capture and weekly promotion |

See [skills/README.md](./skills/README.md) for the full taxonomy.

## 2. Bootstrapping instruction

1. **Read [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) first** to align on hexagonal architecture, DDD, vertical slices, and clean code.
2. **Detect the stack** from the user's codebase. Activate matching `lang-*` and `framework-*` skills.
3. **Follow the orchestrator** via [agent-orchestrator](./skills/agent-orchestrator/SKILL.md) for feature work: Analysis → TDD design → XFN quality → Implementation → Audit → Telemetry.

## 3. Dynamic specialist activation

When executing a lifecycle phase, assume the matching role skill:

| Phase | Skill |
|-------|-------|
| Requirements / specs | [agent-spec](./skills/agent-spec/SKILL.md) - include cross-functional acceptance criteria |
| Design / functional tests | [agent-tdd](./skills/agent-tdd/SKILL.md) - inventory the functional catalog; align on test-case impact before red-green-refactor |
| Design / cross-functional quality | [agent-xfn](./skills/agent-xfn/SKILL.md) - browser E2E, a11y, security tests, load; apply/skip matrix + suites |
| Adapters & infrastructure | [agent-adapter](./skills/agent-adapter/SKILL.md) - re-confirm if implementation impacts tests outside the Design maps |
| Security audit | [agent-security](./skills/agent-security/SKILL.md) - code review plus verify agreed security suites exist |
| Architecture conformance | [agent-arch-drift](./skills/agent-arch-drift/SKILL.md) |
| Observability | [agent-telemetry](./skills/agent-telemetry/SKILL.md) |

Phase handovers are written locally under `~/.agents/handover/<project>/` (not into the project repo). See [templates/handover.md](./templates/handover.md).

## 4. Further reading

- [README.md](./README.md) - directory layout and installation
- [lessons/README.md](./lessons/README.md) - capture session learnings; promote via [tasks/kit-review.md](./tasks/kit-review.md)
