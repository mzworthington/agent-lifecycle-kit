# Handover: <phase>

## Metadata

| Field | Value |
|-------|-------|
| **Phase** | spec \| tdd \| xfn \| impl \| audit \| telemetry \| release |
| **Status** | COMPLETE \| BLOCKED |
| **Project** | `<project-name>` |
| **Next agent** | `agent-<role>` |
| **Date** | YYYY-MM-DD |

## Summary

One paragraph describing what was accomplished in this phase.

## Deliverables

- Bullet list of concrete outputs (specs, interfaces, files, audit findings).

## Test case impact

Tests are the behavior catalog (source of truth above docs). Required for **tdd**, **xfn**, and **impl**; draft OK for **spec**.

| Case / suite | Layer (unit / slice / browser E2E / a11y / security / load) | Action (keep / extend / rewrite / retire / add) | Aligned with user? |
|--------------|---------------------------------------------------------------|--------------------------------------------------|--------------------|
| … | … | … | yes / pending |

During **impl**, if impact expands beyond the Design map, re-confirm with the user and update this table before changing those tests.

## Cross-functional matrix

Required for **xfn**; draft criteria OK for **spec**. See [agent-xfn](../skills/agent-xfn/SKILL.md).

| Quality | Apply / skip | Rationale | Threshold / SLO | Suites / paths |
|---------|--------------|-----------|-----------------|----------------|
| Browser E2E | | | | |
| Accessibility | | | | |
| Security tests | | | | |
| Load / performance | | | | |

## Open questions / blockers

- List anything that must be resolved before the next phase.

## Context for next agent

Pointers to files, decisions, and constraints the next role must respect.
