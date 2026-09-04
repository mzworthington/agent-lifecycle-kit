# PostHog findings: <project-name>

Copy to `~/.agents/handover/<project>/posthog-findings.md` during Session A (Intake). Procedure: [SOPs/product-signal-intake.md](../SOPs/product-signal-intake.md).

## Metadata

| Field | Value |
|-------|-------|
| **Project** | `<project-name>` (name only, never a project key) |
| **Date** | YYYY-MM-DD |
| **Evidence window** | e.g. last 7 days or 2026-08-01 to 2026-09-01 |
| **Session** | A (`wk mcp posthog`) then restore default |
| **Human gate** | pending \| approved rows listed below \| rejected |
| **Profile restored** | yes (`wk mcp default`) \| no |

Do not write `phc_` tokens, project API keys, or numeric project ids anywhere on this page.

## Findings

Each row needs all five columns. Kind is `bug` / `contract` / `bet` / `skip`. Size is `sitting` / `epic` (use `n/a` on `skip`). Proposed next agent is a skill name, or `n/a` on `skip`.

| Signal | Evidence window | Kind | Size | Proposed next agent |
|--------|-----------------|------|------|---------------------|
| | | bug \| contract \| bet \| skip | sitting \| epic | |

## Query coverage

Mark each query from the intake SOP. Unrun queries are not silent skips: say why.

| Query | Ran | Notes |
|-------|-----|-------|
| Errors | yes \| no | |
| Empty or dropping events | yes \| no | |
| Funnel drop-offs | yes \| no | |
| Flag exposure vs leading indicator | yes \| no | |
| Timeboxed bets due | yes \| no | |

## Human gate

Stop after Session A. A human must approve rows before Session B (`wk mcp default`) File.

| Field | Value |
|-------|-------|
| **Approved signals** | list or none |
| **Rejected signals** | list or none |
| **Approver** | name or n/a |
| **Linear created** | no (Intake) \| yes (after File) |

## Context for File / Play

- File: [agent-user-stories](../skills/agent-user-stories/SKILL.md) on default only
- Play: [linear-ticket-workflow](../SOPs/linear-ticket-workflow.md) plus the proposed next agent on each approved row
