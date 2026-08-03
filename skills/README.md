# Skills taxonomy

All invocable instructions live here as [Cursor Agent Skills](https://cursor.com/docs/agent/skills) (`<name>/SKILL.md` with YAML frontmatter).

The kit enforces **hexagonal architecture**, **domain-driven design**, **vertical slices**, and **clean code** - see [CODING_PHILOSOPHY.md](../CODING_PHILOSOPHY.md).

We use **one `skills/` tree** rather than separate `agents/` and `skills/` folders, because Cursor discovers skills from this path. Taxonomy is expressed via frontmatter (`kind`, `phase`, `triggers`) and naming prefixes.

## Naming convention

| Prefix | `kind` | When to use |
|--------|--------|-------------|
| `agent-*` | `role` | Lifecycle persona for a single phase (spec, TDD, audit, …) |
| `lang-*` | `profile` | Language-wide coding rules (TypeScript, Java, C#) |
| `framework-*` | `profile` | Framework-specific delivery rules (Next.js, Spring, …) |

**Roles vs profiles:** Roles define *who you are* and *what phase output* to produce. Profiles define *how to write code* for a stack. The orchestrator (`agent-orchestrator`) routes between roles; stack detection activates profiles.

## Lifecycle roles (`agent-*`)

| Skill | Phase | Loads when |
|-------|-------|------------|
| [agent-orchestrator](./agent-orchestrator/SKILL.md) | orchestration | Multi-phase feature work, handovers |
| [agent-spec](./agent-spec/SKILL.md) | spec | Requirements, Gherkin, XFN criteria, ambiguity removal |
| [agent-tdd](./agent-tdd/SKILL.md) | tdd | Functional catalog, test-impact plan, red-green-refactor, port interfaces → always hands off to XFN |
| [agent-xfn](./agent-xfn/SKILL.md) | xfn | XFN matrix (plan then post-wiring green); browser E2E, a11y, security, load |
| [agent-adapter](./agent-adapter/SKILL.md) | impl | Infrastructure, DB, external APIs; re-confirm impact; XFN fixtures |
| [agent-security](./agent-security/SKILL.md) | audit | OWASP, validation, secrets; verify XFN security suites |
| [agent-arch-drift](./agent-arch-drift/SKILL.md) | audit | Hexagonal boundaries, SOLID, catalog/XFN completeness |
| [agent-adr](./agent-adr/SKILL.md) | audit | Sparse MADR ADRs in `docs/ADRs/` (hard to reverse / off-norm only) |
| [agent-telemetry](./agent-telemetry/SKILL.md) | telemetry | Logging, tracing, metrics; XFN SLO mapping |

Related SOP: [SOPs/behavior-catalog-and-xfn.md](../SOPs/behavior-catalog-and-xfn.md).

## Stack profiles

| Language | Frameworks |
|----------|------------|
| [lang-typescript](./lang-typescript/SKILL.md) | [framework-next](./framework-next/SKILL.md), [framework-nuxt](./framework-nuxt/SKILL.md) |
| [lang-java](./lang-java/SKILL.md) | [framework-springboot](./framework-springboot/SKILL.md), [framework-quarkus](./framework-quarkus/SKILL.md) |
| [lang-csharp](./lang-csharp/SKILL.md) | [framework-dotnet](./framework-dotnet/SKILL.md) |

## Frontmatter fields

Every `SKILL.md` includes:

```yaml
---
name: agent-spec              # lowercase identifier (Cursor discovery)
description: ...              # third person; WHAT + WHEN (trigger terms)
kind: role | profile          # taxonomy
phase: spec | tdd | xfn | ... # lifecycle phase (roles only)
triggers: [...]               # keywords for routing
depends-on: [...]             # related skills
tools: []                     # optional CLI/tool hints for the agent
---
```

## Extending

- Add project-specific rules in **your app repo** (`.cursor/skills/` or a local overlay), not here.
- Add new languages/frameworks by copying a profile skill and adjusting frontmatter.
- Keep role skills focused on behavior and output schema; keep stack detail in profiles.
- Shared MCP servers live in [mcps/](../mcps/) (not under `skills/`); see [SOPs/mcp-library.md](../SOPs/mcp-library.md).
- Capture session lessons locally under `lessons/<project>/`; promote approved rules via [tasks/kit-review.md](../tasks/kit-review.md).

## External (official) skills

Do **not** vendor Cloudflare / Vercel / other upstream skills into this tree. Declare them in [external.lock.json](./external.lock.json) and sync with `gh skill`:

```bash
./scripts/sync-external-skills.sh --install   # → ~/.cursor/skills (user scope)
./scripts/sync-external-skills.sh --update    # pull upstream changes
```

Defaults include Cloudflare platform skills (`cloudflare/skills`) and Vercel `react-best-practices` (`vercel-labs/agent-skills`). Full procedure: [SOPs/external-skills.md](../SOPs/external-skills.md).
