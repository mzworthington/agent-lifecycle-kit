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

Catalog: [models/catalog.yaml](../models/catalog.yaml). Host overlays: [models/hosts/](../models/hosts/). CLI: `wk model resolve --skill <id> [--phase <id>] [--host cursor|claude|copilot|antigravity] [--spec-complete] [--blocked]`.

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
4. Map class → slug via `models/hosts/<host>.yaml`. Host files: [docs/hosts.md](../docs/hosts.md).
5. **Subagents:** pass that slug as `model`. **Parent chat:** recommend a switch when the class changes; the host cannot force it.
6. User or memory MCP `Preference` overrides the overlay for this session.

Until spec handover is COMPLETE, stay on `plan` for gated skills (`agent-tdd`, `agent-xfn`, …). After COMPLETE, drop to `implement` unless the next specialist is `review` or `cheap`.

## Cursor cost (this host)

Stay on the **Cursor Models** pool: Grok 4.6, Grok 4.5, Composer 2.5. Do **not** default to Kimi K3, Kimi K2.7, GLM, GPT, or Opus. Those bill **Other Models** (smaller included pool, higher API rates). Kimi K3 is a user override for huge-context planning only.

| Class | Subagent slug | Parent chat |
|-------|----------------|-------------|
| `plan` / `review` / `implement` | `cursor-grok-4.6-medium` | Grok 4.6 (medium, not Fast) |
| `cheap` | `composer-2.5-fast` (Task allowlist) | Composer 2.5 **without** Fast |

Composer 2.5 standard ($0.50 / $2.50) is the actually cheap model. Composer Fast and Grok Fast are latency SKUs, not the cheap class. Do not pass `cursor-grok-4.5-high-fast` for implement.

Eval: [evals/edd/model_routing.yaml](../evals/edd/model_routing.yaml) (`wk eval run --suite evals/edd/model_routing.yaml --model scripted`).

