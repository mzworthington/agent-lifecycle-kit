# Agent Bootstrap

This repository **is** the `.agents` kit. Consumers symlink `~/.agents` here (`install.sh`). App repos use the thin handshake: [templates/project-AGENTS.md](./templates/project-AGENTS.md).

Do not commit or push unless the user explicitly asks.

**Do not eager-read** philosophy, SOPs, or skills. Use this index, then load only what the task needs (file read or **kit-knowledge** MCP).

## Invariants (always on)

1. **Hexagonal** - dependencies point inward; domain stays pure.
2. **Mermaid** for diagrams; no ASCII/box-drawing architecture art ([CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) §8 when writing diagrams).
3. **Conventional commits and PR titles** - [SOPs/conventional-commits.md](./SOPs/conventional-commits.md) (squash-and-merge uses the PR title).
4. **Tests are the behavior catalog** - align functional + XFN impact before non-trivial coding.
5. **One MCP profile per session** - prefer skill frontmatter `mcp:` ids; more tools cost tokens ([mcps/README.md](./mcps/README.md)).

## Load on demand

| Need | Load |
|------|------|
| Architecture / clean-code detail | [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) or kit-knowledge `get_philosophy_section` |
| Feature routing / multi-phase | [agent-orchestrator](./skills/agent-orchestrator/SKILL.md) |
| Phase work | Matching `skills/agent-*` only for that phase |
| Stack rules | Matching `lang-*` / `framework-*` after detecting the codebase |
| Catalog / XFN matrix | [SOPs/behavior-catalog-and-xfn.md](./SOPs/behavior-catalog-and-xfn.md) during Design |
| Debug / RCA | [agent-debug](./skills/agent-debug/SKILL.md) + [SOPs/hypothesis-driven-debug.md](./SOPs/hypothesis-driven-debug.md) |
| EDD (prompts, MCP tools, routing) | [docs/edd.md](./docs/edd.md) + [SOPs/eval-driven-development.md](./SOPs/eval-driven-development.md) |
| SOP / handover search | **kit-knowledge** MCP (`search_kit`, `get_sop`, `get_handover`, `get_entity`, `get_related`) |
| Kit ontology | `ontology/schema.yaml` + derived `ontology/index.json` (`kit ontology generate\|check`) |
| Cross-session facts | **memory** MCP (typed allowlist: glossary/SLO/prefs/project facts — never secrets) |
| Vendor/framework API docs | **context7** MCP |

## Phase → skill

| Phase | Skill |
|-------|-------|
| Idea stress-test | [agent-grilling](./skills/agent-grilling/SKILL.md) / [agent-grill-me](./skills/agent-grill-me/SKILL.md) |
| Spec | [agent-spec](./skills/agent-spec/SKILL.md) |
| TDD short loop | [agent-tdd](./skills/agent-tdd/SKILL.md) |
| XFN | [agent-xfn](./skills/agent-xfn/SKILL.md) |
| Adapter deep-dive | [agent-adapter](./skills/agent-adapter/SKILL.md) (only if gear 2 is too large) |
| UI / copy | [agent-ui](./skills/agent-ui/SKILL.md), [agent-copy](./skills/agent-copy/SKILL.md) (human-centric / de-AI voice) |
| Migration / API contract | [agent-migration](./skills/agent-migration/SKILL.md), [agent-api-contract](./skills/agent-api-contract/SKILL.md) |
| Review / docs / release | [agent-review](./skills/agent-review/SKILL.md), [agent-docs](./skills/agent-docs/SKILL.md) (+ [agent-copy](./skills/agent-copy/SKILL.md) for narrative voice), [agent-release](./skills/agent-release/SKILL.md) |
| Incident / security / arch | [agent-incident](./skills/agent-incident/SKILL.md), [agent-security](./skills/agent-security/SKILL.md), [agent-arch-drift](./skills/agent-arch-drift/SKILL.md), [agent-adr](./skills/agent-adr/SKILL.md) |
| Prune / perf / debug / telemetry | [agent-prune](./skills/agent-prune/SKILL.md), [agent-perf-opt](./skills/agent-perf-opt/SKILL.md), [agent-debug](./skills/agent-debug/SKILL.md), [agent-telemetry](./skills/agent-telemetry/SKILL.md), [agent-cloudflare-ops](./skills/agent-cloudflare-ops/SKILL.md) |
| Pre-commit | [agent-pre-commit](./skills/agent-pre-commit/SKILL.md) |

Handovers: `~/.agents/handover/<project>/` ([templates/handover.md](./templates/handover.md)). Run pre-commit before marking a phase **COMPLETE** when hooks exist.

Public site: GitHub Pages at [eval-driven-development.dev](https://eval-driven-development.dev) (custom-domain DNS in [edge-dns](https://github.com/mzworthington/edge-dns)).

Taxonomy: [skills/README.md](./skills/README.md). MCP catalog: [mcps/README.md](./mcps/README.md). Context budget: [SOPs/context-budget.md](./SOPs/context-budget.md).
