# PRD / bet: <short name>

## Metadata

| Field | Value |
|-------|-------|
| **Project** | `<project-name>` |
| **Kind** | contract \| bet |
| **Status** | draft \| ready \| in-flight \| confirmed \| killed |
| **Date** | YYYY-MM-DD |
| **Owner** | name or role |

## Problem

Who is hurt, what they cannot do, and how we know (quote, metric, support thread). One paragraph.

## Belief

We believe that **[change]** for **[persona]** will **[outcome]**.

## Leading indicator

| Field | Value |
|-------|-------|
| **Signal** | One measurable event or rate |
| **Baseline** | Current value or “unknown — instrument first” |
| **Success** | Threshold that confirms the belief |
| **Window** | Timebox or event that triggers the decision |

## Kill criteria

Stop or roll back if **[falsifier]** happens before the window ends.

## Experiment

Cheapest test that can kill the belief (flag-gated path, preview, fake door, prototype). Not a delivery plan.

## Feature flag

| Field | Value |
|-------|-------|
| **Needed?** | yes \| n/a (reason) |
| **Name** | `flag.example.bet` or n/a |
| **Default** | off (bets) \| on (kill switch only) |
| **Audience** | who sees flag-on |
| **Owner** | who may toggle |
| **Expiry** | YYYY-MM-DD (required if Needed = yes) |

## Out of scope

Explicit non-goals for this card.

## Next

- Stories: [agent-user-stories](../skills/agent-user-stories/SKILL.md)
- Spec: [agent-spec](../skills/agent-spec/SKILL.md)

Procedure: [SOPs/hypothesis-driven-development.md](../SOPs/hypothesis-driven-development.md).
