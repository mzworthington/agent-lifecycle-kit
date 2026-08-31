---
title: Kit routing & EDD eval harness
kind: task
frequency: on-demand
triggers:
  - eval harness
  - routing eval
  - golden prompts
  - kit quality
  - edd
  - eval driven development
---
# Kit routing & EDD eval harness

## A. Orchestrator routing (skill triggers)

Score whether [agent-orchestrator](../skills/agent-orchestrator/SKILL.md) picks the **smallest correct route**. Run after kit changes that touch routing, or during [kit-review](./kit-review.md).

### Method

For each golden prompt: note expected route, actual route an agent took (or would take from the scope gate table), and pass/fail. Do not invent calendar estimates—record only routing correctness and missing handovers.

### Golden prompts

| # | Prompt (summary) | Expect |
|---|------------------|--------|
| 1 | “Add feature X: new bounded context + API” | Full lifecycle: spec → tdd impact → xfn plan → **tdd short loop (gear 1+2)** → xfn green → audit → telemetry → release |
| 2 | “CI failed / flake on main” | `agent-debug` → pre-commit; light XFN if UI/auth/SLO |
| 3 | “Rename column on orders table safely” | `agent-migration` (expand/contract); not full feature lifecycle |
| 4 | “Review this PR” | `agent-review` (boundaries + catalog/XFN) |
| 5 | “One-line typo in copy” | Direct fix + light XFN floor; no spec handover |
| 6 | “Wire Stripe for a port we just greened” | Prefer **tdd gear 2** same session; `agent-adapter` only if deep-dive |
| 7 | “Production 500s spiking” | `agent-incident` → `agent-debug` (+ Sentry/Slack when configured) |
| 8 | “Change MCP tool schema / system prompt for routing” | **EDD:** `kit eval run|ci` ([docs/edd.md](../docs/edd.md)); not vibes-only |

### Pass criteria

- [ ] No prompt routed to a larger path than required
- [ ] TDD vs adapter deep-dive distinction held for #6
- [ ] XFN never assigned to `agent-tdd`
- [ ] Failures become lessons under `~/.agents/lessons/<project>/` or kit PRs

## B. Eval-Driven Development (agent tools / MCP)

After prompt or MCP tool schema changes:

```bash
pnpm test
pnpm kit eval ci --suite evals/edd/architecture_routing.yaml --threshold-routing 95 --out out/reports
pnpm kit eval report --format md --out out/reports
```

- [ ] Routing accuracy ≥ 95% on routing-tagged cases
- [ ] Self-correction + terminal-fallback suites green
- [ ] Markdown report attached / uploaded as CI artifact (and published to the Actions job summary)
- [ ] Prod failures converted to JSONL when applicable ([SOP](../SOPs/edd-production-telemetry.md))
