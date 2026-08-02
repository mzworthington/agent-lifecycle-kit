---
title: Behavior Catalog & Cross-Functional Quality
kind: sop
triggers:
  - behavior catalog
  - test impact
  - xfn
  - cross functional
  - e2e
  - accessibility
  - load test
tools:
  - read
  - write
  - shell
---
# Standard Operating Procedure: Behavior Catalog & XFN

Follow these steps for any non-trivial change. Tests are the source of truth for intended behavior above documentation. Full detail lives in [agent-tdd](../skills/agent-tdd/SKILL.md) and [agent-xfn](../skills/agent-xfn/SKILL.md).

## 1. Inventory

- Locate related **unit** and **slice** tests (functional catalog).
- Locate related **browser E2E**, **a11y**, **security**, and **load** suites (XFN catalog).
- Prefer tests over README/docs when they disagree; flag the conflict.

## 2. Impact map (functional)

- Classify each relevant functional case: **keep / extend / rewrite / retire / add**.
- Present the map to the user; do not edit catalog cases without alignment.
- Record in `handover_tdd.md` (see [templates/handover.md](../templates/handover.md)).

## 3. XFN matrix

Mark every quality **apply** or **skip** with a reason. Silent omission is not allowed.

| Quality | Default apply when |
|---------|-------------------|
| Browser E2E | User-visible critical journey |
| Accessibility | Any UI surface touched |
| Security tests | Authn/authz, sensitive data, trust boundaries, new inputs |
| Load / performance | Latency/throughput SLO or high-traffic path |

- Classify applicable XFN cases: keep / extend / rewrite / retire / add.
- Capture thresholds (WCAG level, p95, RPS, authz rule).
- Align with the user; record in `handover_xfn.md`.

### Light XFN (bug-fix / design-light routes)

Minimum floor - not optional when the condition matches:

| Touch | Minimum |
|-------|---------|
| UI surface | Accessibility apply (axe or project equivalent on touched surface) |
| Auth / trust boundary | At least one security denial or abuse case |
| Latency-sensitive or SLO path | Load/performance apply, or skip with explicit SLO-not-in-scope reason |
| Otherwise | Full matrix with skip reasons for unused qualities |

## 4. Plan vs green (XFN)

1. **Plan (Design)** - Matrix, impact, thresholds, suite stubs/specs, how-to-run. Status may be COMPLETE for planning even if browser/load are not green yet.
2. **Wire (Impl)** - Adapters/fixtures needed by suites; re-confirm if impact expands.
3. **Green (post-wiring)** - Return to `agent-xfn` (or complete under orchestrator) to make agreed apply suites pass. Do not mark Release COMPLETE while apply rows lack green suites.

## 5. Suite paths & how to run

- List concrete file paths for every apply row.
- Document local/CI commands (`mise` task, `pnpm test:e2e`, `k6 run`, etc.).
- Prefer tooling from the active `lang-*` / `framework-*` profile; propose new tools only with user alignment.

## 6. Audit gates

Before Release:

- [ ] Functional impact map aligned (`yes`, not `pending`)
- [ ] XFN matrix complete (every quality apply or skip + rationale)
- [ ] Every **apply** row has suite paths; suites exist and were greened (or BLOCKED with owner)
- [ ] No silent catalog rewrites (assertions weakened / cases deleted without alignment)
- [ ] Load SLOs (if any) handed to telemetry for metrics/alerts
