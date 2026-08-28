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
| Lifecycle roles | [skills/agent-*](./skills/) | Spec, TDD short loop, XFN, optional adapter deep-dive, migration, review, docs, release, incident, security, arch-drift, ADR, prune, debug, telemetry, pre-commit |
| Domain profiles | [skills/profile-*](./skills/) | Secure IaC, API, MCP, observability ([profile-iac](./skills/profile-iac/SKILL.md), [profile-api](./skills/profile-api/SKILL.md), [profile-mcp](./skills/profile-mcp/SKILL.md), [profile-observability](./skills/profile-observability/SKILL.md)) |
| Language profiles | [skills/lang-*](./skills/) | TypeScript, Rust, Python, Go, Java, C#, HCL |
| Framework profiles | [skills/framework-*](./skills/) | Next.js, React, Express, Nuxt, FastAPI, Spring Boot, Quarkus, .NET, Terraform, Pulumi |
| MCP library | [mcps/](./mcps/) | Catalogued MCP servers + profiles composed into Cursor `mcp.json` |
| Procedures | [SOPs/](./SOPs/), [tasks/](./tasks/) | Repeatable operational checklists (incl. [behavior catalog & XFN](./SOPs/behavior-catalog-and-xfn.md), [complexity hotspots](./SOPs/complexity-hotspots.md), [conventional commits & PR titles](./SOPs/conventional-commits.md)) |
| Templates | [templates/](./templates/) | Handover, lesson, project handshake, and project MCP formats |
| Kit improvement | [lessons/](./lessons/), [tasks/kit-review.md](./tasks/kit-review.md) | Local lesson capture and weekly promotion |

See [skills/README.md](./skills/README.md) for the skills taxonomy and [mcps/README.md](./mcps/README.md) for MCP profiles.

## 2. Bootstrapping instruction

1. **Read [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) first** to align on hexagonal architecture, DDD, vertical slices, and clean code. Prefer **Mermaid** for diagrams; do not create or maintain ASCII/box-drawing art diagrams (see Interaction Mandate §8). Use **conventional commit** subjects for git commits **and** PR titles ([SOPs/conventional-commits.md](./SOPs/conventional-commits.md)) — squash-and-merge uses the PR title on the default branch.
2. **Detect the stack** from the user's codebase. Activate matching `lang-*` and `framework-*` skills.
3. **Follow the orchestrator** via [agent-orchestrator](./skills/agent-orchestrator/SKILL.md) for feature work: **Grilling (if ambiguous/unsettled)** → Spec → TDD impact → XFN plan → **TDD short loop (gear 1+2)** → XFN green → Audit → Telemetry → Release. Prefer gear-2 thin adapters inside `agent-tdd`; use `agent-adapter` only for deep-dives.
4. **Catalog & XFN procedure** - [SOPs/behavior-catalog-and-xfn.md](./SOPs/behavior-catalog-and-xfn.md).
5. **Complexity hotspots** - [SOPs/complexity-hotspots.md](./SOPs/complexity-hotspots.md) (audit backlog → `agent-prune` complexity track).
6. **MCP tools** - Prefer catalogued servers in [mcps/](./mcps/) (and skill frontmatter `mcp:`) when phases/triggers match. Add/compose via [SOPs/mcp-library.md](./SOPs/mcp-library.md).
7. **External skills** - Official Cloudflare / Vercel (and similar) skills are declared in [skills/external.lock.json](./skills/external.lock.json) and synced with `gh skill` via [SOPs/external-skills.md](./SOPs/external-skills.md). Do not vendor them into `skills/`.

## 3. Dynamic specialist activation

When executing a lifecycle phase, assume the matching role skill:

| Phase | Skill |
|-------|-------|
| Idea / plan stress-testing | [agent-grilling](./skills/agent-grilling/SKILL.md) (primitive) / [agent-grill-me](./skills/agent-grill-me/SKILL.md) (stateless) - design tree & decision frontier |
| Requirements / specs | [agent-spec](./skills/agent-spec/SKILL.md) - include cross-functional acceptance criteria |
| Design / functional tests + short loop | [agent-tdd](./skills/agent-tdd/SKILL.md) - catalog impact; gear-1 domain/handlers; gear-2 thin adapters same session |
| Design / cross-functional quality | [agent-xfn](./skills/agent-xfn/SKILL.md) - matrix + stubs in plan; green apply suites after wiring |
| Adapter deep-dive (optional) | [agent-adapter](./skills/agent-adapter/SKILL.md) - only when gear 2 is too large |
| UI delivery | [agent-ui](./skills/agent-ui/SKILL.md) - thin delivery adapters; a11y with XFN |
| Schema migration | [agent-migration](./skills/agent-migration/SKILL.md) - expand/contract ([SOP](./SOPs/db-migration.md)) |
| API contracts | [agent-api-contract](./skills/agent-api-contract/SKILL.md) - OpenAPI/AsyncAPI ([SOP](./SOPs/api-contracts.md)) |
| PR review | [agent-review](./skills/agent-review/SKILL.md) - boundaries + catalog/XFN |
| Docs / release | [agent-docs](./skills/agent-docs/SKILL.md), [agent-release](./skills/agent-release/SKILL.md) ([SOP](./SOPs/release.md)) |
| Incident | [agent-incident](./skills/agent-incident/SKILL.md) - stabilize → `agent-debug` |
| Security audit | [agent-security](./skills/agent-security/SKILL.md) - OWASP review + security suite presence |
| Architecture conformance | [agent-arch-drift](./skills/agent-arch-drift/SKILL.md) - boundaries plus catalog/XFN completeness |
| Architecture decisions | [agent-adr](./skills/agent-adr/SKILL.md) - sparse MADR under `docs/ADRs/` when hard to reverse or off-norm |
| Dead-code pruning | [agent-prune](./skills/agent-prune/SKILL.md) - dead-code and complexity hotspot tracks |
| Performance optimization | [agent-perf-opt](./skills/agent-perf-opt/SKILL.md) - profiling memory leaks, CPU bottlenecks, SQL EXPLAIN ANALYZE |
| Debugging / RCA | [agent-debug](./skills/agent-debug/SKILL.md) - hypothesis board, repro, proof gates ([SOP](./SOPs/hypothesis-driven-debug.md)) |
| Observability | [agent-telemetry](./skills/agent-telemetry/SKILL.md) - map XFN load SLOs to metrics/alerts |
| Pre-commit / quality gate | [agent-pre-commit](./skills/agent-pre-commit/SKILL.md) |

Phase handovers are written locally under `~/.agents/handover/<project>/` (not into the project repo). See [templates/handover.md](./templates/handover.md) (per-phase Definition of Done).

Before marking a phase **COMPLETE**, run [agent-pre-commit](./skills/agent-pre-commit/SKILL.md) when the repo has a pre-commit hook. Commit subjects and PR titles must follow [SOPs/conventional-commits.md](./SOPs/conventional-commits.md).

## 4. Further reading

- [README.md](./README.md) - directory layout and installation
- [mcps/README.md](./mcps/README.md) - MCP catalog, profiles, and compose/install
- [SOPs/conventional-commits.md](./SOPs/conventional-commits.md) - Conventional Commits for git commits and PR titles (squash-and-merge)
- [lessons/README.md](./lessons/README.md) - capture session learnings; promote via [tasks/kit-review.md](./tasks/kit-review.md)
