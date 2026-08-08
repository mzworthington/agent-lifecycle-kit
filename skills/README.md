# Skills taxonomy

All invocable instructions live here as [Cursor Agent Skills](https://cursor.com/docs/agent/skills) (`<name>/SKILL.md` with YAML frontmatter).

The kit enforces **hexagonal architecture**, **domain-driven design**, **vertical slices**, and **clean code** - see [CODING_PHILOSOPHY.md](../CODING_PHILOSOPHY.md).

We use **one `skills/` tree** rather than separate `agents/` and `skills/` folders, because Cursor discovers skills from this path. Taxonomy is expressed via frontmatter (`kind`, `phase`, `triggers`) and naming prefixes.

## Naming convention

| Prefix | `kind` | When to use |
|--------|--------|-------------|
| `agent-*` | `role` | Lifecycle persona for a single phase (spec, TDD, audit, …) |
| `profile-*` | `profile` | Cross-stack domain rules (IaC security, CAF, …) |
| `lang-*` | `profile` | Language-wide coding rules (TypeScript, Java, C#, HCL) |
| `framework-*` | `profile` | Framework-specific delivery rules (Next.js, Spring, Terraform, …) |

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
| [agent-prune](./agent-prune/SKILL.md) | maintenance | Dead-code removal and complexity hotspot reduction in safe batches |
| [agent-debug](./agent-debug/SKILL.md) | debug | Hypothesis-driven RCA for bugs, CI failures, live-site symptoms |
| [agent-telemetry](./agent-telemetry/SKILL.md) | telemetry | Logging, tracing, metrics; XFN SLO mapping |
| [agent-pre-commit](./agent-pre-commit/SKILL.md) | quality | Pre-commit hook discovery, run checks, fix failures |

Related SOPs: [behavior catalog & XFN](../SOPs/behavior-catalog-and-xfn.md), [complexity hotspots](../SOPs/complexity-hotspots.md), [hypothesis-driven debug](../SOPs/hypothesis-driven-debug.md), [Cloudflare observability & diagnosis](../SOPs/cloudflare-observability-and-diagnosis.md).

## Stack profiles

| Language / domain | Frameworks |
|-------------------|------------|
| [profile-iac](./profile-iac/SKILL.md) (secure IaC, CAF, least privilege) | [framework-terraform](./framework-terraform/SKILL.md), [framework-pulumi](./framework-pulumi/SKILL.md) |
| [lang-hcl](./lang-hcl/SKILL.md) | [framework-terraform](./framework-terraform/SKILL.md) |
| [lang-typescript](./lang-typescript/SKILL.md) | [framework-next](./framework-next/SKILL.md), [framework-nuxt](./framework-nuxt/SKILL.md), [framework-pulumi](./framework-pulumi/SKILL.md) |
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

## Kit vs external

Two ownership models — do not mix them in git.

| Kind | Committed in this repo? | Location | Update path |
|------|-------------------------|----------|-------------|
| **Kit-authored** | Yes | `skills/agent-*`, `skills/profile-*`, `skills/lang-*`, `skills/framework-*` | PRs in this repo |
| **Upstream / official** | No (lockfile only) | `~/.cursor/skills` via `gh skill` | [external.lock.json](./external.lock.json) + sync script |

**Why:** Upstream skills (Cloudflare, Vercel, etc.) are large, change often, and carry their own licenses. Vendoring them into `skills/` bloats the repo, blocks clean upgrades, and blurs ownership with lifecycle roles.

`.gitignore` blocks accidental commits of non-kit directories under `skills/`. Validate locally:

```bash
chmod +x scripts/verify-skills-layout.sh   # once
./scripts/verify-skills-layout.sh
```

### Install upstream skills

Declare in [external.lock.json](./external.lock.json); install to Cursor **user** scope:

```bash
./scripts/sync-external-skills.sh --install   # → ~/.cursor/skills
./scripts/sync-external-skills.sh --update    # pull upstream changes
```

Or during bootstrap: `INSTALL_EXTERNAL_SKILLS=1 ./install.sh`

Defaults include Cloudflare platform skills (`cloudflare/skills`) and Vercel `react-best-practices` (`vercel-labs/agent-skills`). Full procedure: [SOPs/external-skills.md](../SOPs/external-skills.md).

### If upstream skills landed in `skills/`

`gh skill` or Cursor sometimes writes into the kit tree when `~/.agents` is symlinked here. Remove them from `skills/` (they are gitignored) and reinstall:

```bash
rm -rf skills/cloudflare skills/wrangler   # example — only non-kit dirs
./scripts/sync-external-skills.sh --install
./scripts/verify-skills-layout.sh
```

Do **not** add upstream skills to git. To pin a new upstream skill, append to the lockfile and re-run `--install`.
