---
title: Model routing - capability class then host slug
kind: sop
triggers:
  - model selection
  - model class
  - which model
  - plan vs implement model
  - cursor model slug
  - subagent model
tools:
  - read
  - shell
---
# Standard Operating Procedure: Model routing

Pick a **capability class**, then a **host slug**. Do not put vendor model ids in skills or `AGENTS.md`.

Catalog: [models/catalog.yaml](../models/catalog.yaml). Cursor overlay: [models/hosts/cursor.yaml](../models/hosts/cursor.yaml). CLI: `wk model resolve --skill <id> [--phase <id>] [--host cursor] [--spec-complete] [--blocked]`.

## Classes

| Class | Use when |
|-------|----------|
| `plan` | Ambiguity, grilling, spec, orchestration, RCA, or any BLOCKED / new architectural fork |
| `review` | Security, arch-drift, PR review — adversarial even after a solid plan |
| `implement` | Frozen plan: TDD short loop, thin adapters, most delivery |
| `cheap` | Mechanical: pre-commit, format, release checklist |

## Resolve

1. If the phase is **BLOCKED** or a new architectural fork appears → `plan`.
2. Else look up the specialist in `catalog.yaml` `skills`. If `gatedBySpec: true` and spec handover is not COMPLETE → `plan`.
3. Else use the skill class, then `phases`, then default `plan`.
4. Map class → slug via `models/hosts/<host>.yaml` (Cursor is the reference host).
5. **Subagents:** pass that slug as `model`. **Parent chat:** recommend a switch when the class changes; the host cannot force it.
6. User or memory MCP `Preference` overrides the overlay for this session.

Until spec handover is COMPLETE, stay on `plan` for gated skills (`agent-tdd`, `agent-xfn`, …). After COMPLETE, drop to `implement` unless the next specialist is `review` or `cheap`.

Eval: [evals/edd/model_routing.yaml](../evals/edd/model_routing.yaml) (`wk eval run --suite evals/edd/model_routing.yaml --model scripted`).
