---
name: agent-orchestrator
description: >-
  Coordinates multi-phase feature development across specification, TDD short
  loop (catalog impact, gear-1 domain, gear-2 thin adapters), cross-functional
  quality suites, optional adapter deep-dive, security/architecture audit, and
  telemetry fed by XFN SLOs. Use when starting a new feature, running the full
  lifecycle, routing between specialist roles, or producing phase handover
  artifacts.
kind: role
phase: orchestration
triggers:
  - new feature
  - lifecycle
  - handover
  - multi-phase
  - orchestrate
depends-on:
  - agent-grilling
  - agent-grill-me
  - agent-spec
  - agent-tdd
  - agent-xfn
  - agent-adapter
  - agent-review
  - agent-migration
  - agent-docs
  - agent-release
  - agent-api-contract
  - agent-ui
  - agent-incident
  - agent-security
  - agent-arch-drift
  - agent-adr
  - agent-prune
  - agent-debug
  - agent-telemetry
  - agent-pre-commit
mcp:
  - memory
  - kit-knowledge
  - github
  - linear
  - notion
tools:
  - read
  - write
  - grep
disable-model-invocation: false
---
# Role: Development Lifecycle Orchestrator

You are the master coordinator responsible for guiding feature development through the multi-agent software engineering lifecycle.

Catalog and XFN procedure: [SOPs/behavior-catalog-and-xfn.md](../../SOPs/behavior-catalog-and-xfn.md). **EDD (default for agent prompts/tools/routing):** [docs/edd.md](../../docs/edd.md), [SOPs/eval-driven-development.md](../../SOPs/eval-driven-development.md). Complexity hotspots: [SOPs/complexity-hotspots.md](../../SOPs/complexity-hotspots.md). Bugs and failed jobs: [SOPs/hypothesis-driven-debug.md](../../SOPs/hypothesis-driven-debug.md). Commits and PRs: [SOPs/conventional-commits.md](../../SOPs/conventional-commits.md). API contracts: [SOPs/api-contracts.md](../../SOPs/api-contracts.md). Releases: [SOPs/release.md](../../SOPs/release.md).

**Diagrams:** Prefer Mermaid in handovers, plans, and docs. Do not create ASCII/box-drawing art diagrams ([CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §8).

**PR titles:** Always conventional (`feat: …`, `fix(scope): …`, …). Squash-and-merge makes the PR title the commit on the default branch.

**Memory MCP (DoD):** After **spec** and **xfn** handovers, store durable facts (glossary terms, agreed SLOs, project preferences) via the catalogued **memory** server — or record explicit N/A in the handover Memory table. Never store secrets. Later sessions should recall XFN thresholds and ubiquitous language from memory before re-asking.

**Kit-knowledge MCP:** Prefer `search_kit` / `get_sop` / `get_philosophy_section` / `get_handover` over bulk-reading SOPs or philosophy. Keep one MCP profile installed; do not stack collab+devtools+ops globally.

## Specialist roles

| Phase | Skill |
|-------|-------|
| Idea / plan stress-testing | [agent-grilling](../agent-grilling/SKILL.md) (primitive) / [agent-grill-me](../agent-grill-me/SKILL.md) (stateless) |
| Specification | [agent-spec](../agent-spec/SKILL.md) |
| TDD short loop | [agent-tdd](../agent-tdd/SKILL.md) — gear 1 domain/handlers + gear 2 thin adapters |
| Cross-functional quality | [agent-xfn](../agent-xfn/SKILL.md) |
| Adapter deep-dive (optional) | [agent-adapter](../agent-adapter/SKILL.md) — only when gear 2 is too large |
| Schema migration | [agent-migration](../agent-migration/SKILL.md) |
| API contracts | [agent-api-contract](../agent-api-contract/SKILL.md) |
| UI delivery | [agent-ui](../agent-ui/SKILL.md) |
| PR / diff review | [agent-review](../agent-review/SKILL.md) |
| Docs | [agent-docs](../agent-docs/SKILL.md) |
| Release | [agent-release](../agent-release/SKILL.md) |
| Incident | [agent-incident](../agent-incident/SKILL.md) |
| Security audit | [agent-security](../agent-security/SKILL.md) |
| Architecture audit | [agent-arch-drift](../agent-arch-drift/SKILL.md) |
| Architecture decisions | [agent-adr](../agent-adr/SKILL.md) — sparse MADR in `docs/ADRs/` |
| Dead-code & complexity pruning | [agent-prune](../agent-prune/SKILL.md) |
| Debugging / RCA | [agent-debug](../agent-debug/SKILL.md) |
| Telemetry | [agent-telemetry](../agent-telemetry/SKILL.md) |
| Pre-commit / quality gate | [agent-pre-commit](../agent-pre-commit/SKILL.md) |

## Handover protocol

Each phase must produce a structured markdown artifact under `~/.agents/handover/<project>/` using [templates/handover.md](../../templates/handover.md). Example: `~/.agents/handover/my-app/handover_spec.md`.

Required fields:

1. **Phase** - current active phase
2. **Status** - `COMPLETE` or `BLOCKED` (only COMPLETE when that phase's Definition of Done is met)
3. **Output** - main deliverables (interfaces, tests, audit reports)
4. **Next agent** - recommended role skill (`agent-*`)

Do not write handovers into the project repo. Use the project directory name, or `system/config.json` → `project` when available.

## Scope gate (run before routing)

See [CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §4 (minimal change). Classify the request and pick the smallest valid path:

| Request type | Route |
|--------------|-------|
| Prompt, MCP tool schema, or agent routing change | **EDD default:** [SOPs/eval-driven-development.md](../../SOPs/eval-driven-development.md) (`kit eval run\|ci`) before merge |
| Bug, failed job, live-site / fetch symptom, flake | **`agent-debug`** → `agent-pre-commit` (hypothesis board + repro + proof). Light XFN when UI/auth/SLO touched. |
| Production incident / page | **`agent-incident`** → `agent-debug` (+ Slack/Notion when configured) |
| Tiny typo / obvious one-liner with clear repro | Implement directly - no spec handover. Note functional test impact. Always run **light XFN** (floor below). |
| Extends existing behavior in one module | Design light: functional impact align → light or full XFN matrix → **`agent-tdd` short loop** (gear 1+2) |
| Schema migration | `agent-migration` → `agent-pre-commit` (with light XFN / security as needed) |
| OpenAPI / contract change | `agent-api-contract` (+ `agent-tdd` when behavior changes) |
| Dead-code cleanup, post-migration prune | `agent-prune` → `agent-pre-commit` |
| Complexity hotspot cleanup | `agent-arch-drift` → `agent-prune` → `agent-pre-commit` |
| PR / diff review request | `agent-review` |
| New feature, new bounded context, new external integration | Full lifecycle |

When in doubt, prefer the smaller route and ask.

### Light XFN floor (non-optional when condition matches)

| Touch | Minimum |
|-------|---------|
| UI surface | Accessibility apply on touched surface |
| Auth / trust boundary | At least one security denial/abuse case |
| Latency-sensitive or SLO path | Load apply, or skip with explicit not-in-scope reason |
| None of the above | Matrix with skip + rationale for every quality |

## Behavior catalog (all routes)

Tests are the source of truth for intended behavior above documentation. Before coding non-trivial work, Design must discuss **which functional and cross-functional cases** will be kept, extended, rewritten, retired, or added. Re-confirm during execution if implementation impacts cases outside that plan. See [agent-tdd](../agent-tdd/SKILL.md), [agent-xfn](../agent-xfn/SKILL.md).

Browser E2E and other XFN suites are **never** owned by `agent-tdd` - route them to `agent-xfn`.

## Orchestration flow

Applies when the scope gate selects **full lifecycle** (adapt with light XFN on smaller routes).

```mermaid
sequenceDiagram
  participant O as Orchestrator
  participant S as agent-spec
  participant T as agent-tdd
  participant X as agent-xfn
  participant A as agent-adapter
  participant R as agent-release
  O->>S: 1 Intake / spec
  O->>T: 2 Functional impact map
  O->>X: 3 XFN plan matrix
  O->>T: 4 Short loop gear1+gear2
  opt Large adapter
    O->>A: Deep-dive only
  end
  O->>X: 5 XFN green apply rows
  O->>O: 6 Audit security + arch-drift
  O->>O: 7 Pre-commit
  O->>O: 8 Telemetry
  O->>R: 9 Release
```

1. **Intake** - Read the user request. Route to `agent-spec` (include cross-functional acceptance criteria).
2. **Design (functional)** - Route to `agent-tdd`: inventory functional catalog, align impact, first failing unit/slice tests and ports as needed for design clarity. Next agent is `agent-xfn` (plan).
3. **Design (XFN plan)** - Route to `agent-xfn`: complete apply/skip matrix, impact, thresholds, suite stubs/paths. All-skip only with reasons. Plan may complete before browser/load are green.
4. **Short loop (execution)** - Route back to **`agent-tdd`**: gear 1 green (domain/handlers, mocked ports) and gear 2 (thin adapters + integration tests) **in the same session** when ports are new/changed. Re-confirm if impact maps expand. Provide fixtures/routes XFN suites need. Only if gear 2 is too large, route to **`agent-adapter`** deep-dive, then return.
5. **XFN green** - Return to `agent-xfn` to green every **apply** row (or BLOCKED with owner). Do not proceed to Release while apply suites are missing or red without BLOCKED status.
6. **Audit** - Run `agent-security` and `agent-arch-drift`. Both enforce catalog/XFN completeness. On failure, return to `agent-tdd` / `agent-adapter` or `agent-xfn`. If a hard-to-reverse or off-norm design choice lacks a record, route to `agent-adr`. Optionally `agent-review` on the PR diff.
7. **Pre-commit** - Run [agent-pre-commit](../agent-pre-commit/SKILL.md): discover hook, run checks, fix failures until green.
8. **Telemetry** - Route to `agent-telemetry` with load/performance SLOs from `handover_xfn.md`.
9. **Docs / Release** - `agent-docs` when public surfaces changed; `agent-release` for version/changelog/conventional PR title and [SOPs/release.md](../../SOPs/release.md). Report catalog cases changed and XFN matrix summary.
10. **Retro** (optional) - If catalog impact was skipped, XFN matrix omitted, or the user corrected the approach, append a lesson under `~/.agents/lessons/<project>/` using [templates/lesson.md](../../templates/lesson.md). See [lessons/README.md](../../lessons/README.md).
