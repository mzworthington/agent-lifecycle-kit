# Skills taxonomy

All invocable instructions live here as [Cursor Agent Skills](https://cursor.com/docs/agent/skills) (`<name>/SKILL.md` with YAML frontmatter).

The kit enforces **hexagonal architecture**, **domain-driven design**, **vertical slices**, and **clean code** - see [CODING_PHILOSOPHY.md](../CODING_PHILOSOPHY.md).

We use **one `skills/` tree** rather than separate `agents/` and `skills/` folders, because Cursor discovers skills from this path. Taxonomy is expressed via frontmatter (`kind`, `phase`, `triggers`) and naming prefixes.

## Naming convention

| Prefix | `kind` | When to use |
|--------|--------|-------------|
| `agent-*` | `role` | Lifecycle persona for a single phase (spec, TDD, audit, …) |
| `lang-*` | `profile` | Language-wide coding rules (TypeScript, Java, .NET) |
| `framework-*` | `profile` | Framework-specific delivery rules (Next.js, Spring, …) |

**Roles vs profiles:** Roles define *who you are* and *what phase output* to produce. Profiles define *how to write code* for a stack. The orchestrator (`agent-orchestrator`) routes between roles; stack detection activates profiles.

## Lifecycle roles (`agent-*`)

| Skill | Phase | Loads when |
|-------|-------|------------|
| [agent-orchestrator](./agent-orchestrator/SKILL.md) | orchestration | Multi-phase feature work, handovers |
| [agent-spec](./agent-spec/SKILL.md) | spec | Requirements, Gherkin, ambiguity removal |
| [agent-tdd](./agent-tdd/SKILL.md) | tdd | Red-green-refactor, port interfaces |
| [agent-adapter](./agent-adapter/SKILL.md) | impl | Infrastructure, DB, external APIs |
| [agent-security](./agent-security/SKILL.md) | audit | OWASP, validation, secrets |
| [agent-arch-drift](./agent-arch-drift/SKILL.md) | audit | Hexagonal boundaries, SOLID |
| [agent-telemetry](./agent-telemetry/SKILL.md) | telemetry | Logging, tracing, metrics |

## Stack profiles

| Language | Frameworks |
|----------|------------|
| [lang-typescript](./lang-typescript/SKILL.md) | [framework-next](./framework-next/SKILL.md), [framework-nuxt](./framework-nuxt/SKILL.md) |
| [lang-java](./lang-java/SKILL.md) | [framework-springboot](./framework-springboot/SKILL.md), [framework-quarkus](./framework-quarkus/SKILL.md) |
| [lang-dotnet](./lang-dotnet/SKILL.md) | - |

## Frontmatter fields

Every `SKILL.md` includes:

```yaml
---
name: agent-spec              # lowercase identifier (Cursor discovery)
description: ...              # third person; WHAT + WHEN (trigger terms)
kind: role | profile          # taxonomy
phase: spec | tdd | ...       # lifecycle phase (roles only)
triggers: [...]               # keywords for routing
depends-on: [...]             # related skills
tools: []                     # optional CLI/tool hints for the agent
---
```

## Extending

- Add project-specific rules in **your app repo** (`.cursor/skills/` or a local overlay), not here.
- Add new languages/frameworks by copying a profile skill and adjusting frontmatter.
- Keep role skills focused on behavior and output schema; keep stack detail in profiles.
