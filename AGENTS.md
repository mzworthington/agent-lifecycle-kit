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
| Lifecycle roles | [skills/agent-*](./skills/) | Spec, TDD, XFN quality, adapter, security, arch-drift, ADR, prune, telemetry, pre-commit |
| Language profiles | [skills/lang-*](./skills/) | TypeScript, Java, C# |
| Framework profiles | [skills/framework-*](./skills/) | Next.js, Nuxt, Spring Boot, Quarkus, .NET |
| MCP library | [mcps/](./mcps/) | Catalogued MCP servers + profiles composed into Cursor `mcp.json` |
| Procedures | [SOPs/](./SOPs/), [tasks/](./tasks/) | Repeatable operational checklists (incl. [behavior catalog & XFN](./SOPs/behavior-catalog-and-xfn.md)) |
| Templates | [templates/](./templates/) | Handover, lesson, project handshake, and project MCP formats |
| Kit improvement | [lessons/](./lessons/), [tasks/kit-review.md](./tasks/kit-review.md) | Local lesson capture and weekly promotion |

See [skills/README.md](./skills/README.md) for the skills taxonomy and [mcps/README.md](./mcps/README.md) for MCP profiles.

## 2. Bootstrapping instruction

1. **Read [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) first** to align on hexagonal architecture, DDD, vertical slices, and clean code.
2. **Detect the stack** from the user's codebase. Activate matching `lang-*` and `framework-*` skills.
3. **Follow the orchestrator** via [agent-orchestrator](./skills/agent-orchestrator/SKILL.md) for feature work: Analysis → TDD design → XFN plan → Implementation → XFN green → Audit → Telemetry.
4. **Catalog & XFN procedure** - [SOPs/behavior-catalog-and-xfn.md](./SOPs/behavior-catalog-and-xfn.md).
5. **MCP tools** - Prefer catalogued servers in [mcps/](./mcps/) when a task matches their phases/triggers. Add/compose via [SOPs/mcp-library.md](./SOPs/mcp-library.md).
6. **External skills** - Official Cloudflare / Vercel (and similar) skills are declared in [skills/external.lock.json](./skills/external.lock.json) and synced with `gh skill` via [SOPs/external-skills.md](./SOPs/external-skills.md). Do not vendor them into `skills/`.

## 3. Dynamic specialist activation

When executing a lifecycle phase, assume the matching role skill:

| Phase | Skill |
|-------|-------|
| Requirements / specs | [agent-spec](./skills/agent-spec/SKILL.md) - include cross-functional acceptance criteria |
| Design / functional tests | [agent-tdd](./skills/agent-tdd/SKILL.md) - inventory the functional catalog; align on test-case impact before red-green-refactor |
| Design / cross-functional quality | [agent-xfn](./skills/agent-xfn/SKILL.md) - matrix + stubs in plan; green apply suites after wiring |
| Adapters & infrastructure | [agent-adapter](./skills/agent-adapter/SKILL.md) - re-confirm impact; prepare XFN fixtures |
| Security audit | [agent-security](./skills/agent-security/SKILL.md) - OWASP review + security suite presence |
| Architecture conformance | [agent-arch-drift](./skills/agent-arch-drift/SKILL.md) - boundaries plus catalog/XFN completeness |
| Architecture decisions | [agent-adr](./skills/agent-adr/SKILL.md) - sparse MADR under `docs/ADRs/` when hard to reverse or off-norm |
| Dead-code pruning | [agent-prune](./skills/agent-prune/SKILL.md) |
| Observability | [agent-telemetry](./skills/agent-telemetry/SKILL.md) - map XFN load SLOs to metrics/alerts |
| Pre-commit / quality gate | [agent-pre-commit](./skills/agent-pre-commit/SKILL.md) |

Phase handovers are written locally under `~/.agents/handover/<project>/` (not into the project repo). See [templates/handover.md](./templates/handover.md) (per-phase Definition of Done).

Before marking a phase **COMPLETE**, run [agent-pre-commit](./skills/agent-pre-commit/SKILL.md) when the repo has a pre-commit hook.

## 4. Further reading

- [README.md](./README.md) - directory layout and installation
- [mcps/README.md](./mcps/README.md) - MCP catalog, profiles, and compose/install
- [lessons/README.md](./lessons/README.md) - capture session learnings; promote via [tasks/kit-review.md](./tasks/kit-review.md)
