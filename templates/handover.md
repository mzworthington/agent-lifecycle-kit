# Handover: <phase>

## Metadata

| Field | Value |
|-------|-------|
| **Phase** | spec \| tdd \| xfn \| impl \| audit \| telemetry \| release |
| **Status** | COMPLETE \| BLOCKED |
| **Project** | `<project-name>` |
| **Next agent** | `agent-<role>` |
| **Date** | YYYY-MM-DD |

Mark **COMPLETE** only when this phase's Definition of Done below is satisfied. Otherwise use **BLOCKED** and list gaps.

## Summary

One paragraph describing what was accomplished in this phase.

## Deliverables

- Bullet list of concrete outputs (specs, interfaces, files, audit findings).

## Test case impact

Tests are the behavior catalog (source of truth above docs). See [SOPs/behavior-catalog-and-xfn.md](../SOPs/behavior-catalog-and-xfn.md).

| Case / suite | Layer (unit / slice / browser E2E / a11y / security / load) | Action (keep / extend / rewrite / retire / add) | Aligned with user? |
|--------------|---------------------------------------------------------------|--------------------------------------------------|--------------------|
| … | … | … | yes / pending |

During **impl**, if impact expands beyond the Design map, re-confirm with the user and update this table before changing those tests.

## Cross-functional matrix

See [agent-xfn](../skills/agent-xfn/SKILL.md).

| Quality | Apply / skip | Rationale | Threshold / SLO | Suites / paths | Green status (planned / green / n/a) |
|---------|--------------|-----------|-----------------|----------------|--------------------------------------|
| Browser E2E | | | | | |
| Accessibility | | | | | |
| Security tests | | | | | |
| Load / performance | | | | | |

## Phase Definition of Done

Incomplete DoD ⇒ Status must be **BLOCKED**, not COMPLETE.

| Phase | Minimum to mark COMPLETE |
|-------|--------------------------|
| **spec** | Gherkin scenarios; draft XFN criteria (or explicit unknowns); draft catalog notes |
| **tdd** | Functional impact table filled; every row Aligned = yes; failing unit/slice tests confirmed red; Next agent = `agent-xfn` |
| **xfn** (plan) | Every matrix quality apply or skip + rationale; impact rows for apply qualities; suite paths or stubs; thresholds; SLOs noted for telemetry; Aligned = yes |
| **xfn** (green) | Every **apply** row Green status = green (or BLOCKED with owner); how-to-run documented |
| **impl** | Adapters wired; confirmation stayed-within Design maps **or** revised maps re-aligned; fixtures needed by XFN noted |
| **audit** | Security + arch findings recorded; catalog/XFN completeness checked (missing apply suites or silent rewrites = fail) |
| **telemetry** | Instrumentation added; XFN load SLOs (if any) mapped to metrics/alerts or explicit N/A |
| **release** | Prior phase DoDs satisfied; catalog + matrix summary reported to user |

## Open questions / blockers

- List anything that must be resolved before the next phase.

## Context for next agent

Pointers to files, decisions, constraints, and (for telemetry) load/performance SLOs from the XFN matrix.
