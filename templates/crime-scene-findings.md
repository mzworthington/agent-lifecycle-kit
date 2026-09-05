# Crime-scene findings

Phase handover for the **crime-scene pass** on [complexity-hotspots](../SOPs/complexity-hotspots.md). Fill in Session A (`agent-arch-drift`, git only). File in Session B (`agent-user-stories`) only after a human gate. Never create Linear issues from this table in Session A.

| Field | Value |
|-------|-------|
| **Project** | `<project-name>` |
| **Date** | YYYY-MM-DD |
| **Evidence window** | e.g. last 6 months (`git log --since`) |
| **Commands** | paste the `git` invocations used |
| **Status** | intake \| gated \| filed |

## Rows

One cluster per row (one sitting). Rank by hotspot score first.

| Cluster | Paths | Hotspot (churn × size) | Temporal coupling | Knowledge | Operator (file / skip) |
|---------|-------|------------------------|-------------------|-----------|------------------------|
| | | commits × LOC | co-change peers | island / fragment / ok | |

Proposed next agent after gate: `agent-user-stories` (epic + children). Play children with `agent-prune`.

## Signal coverage

Mark done or n/a (reason). Git only: no CodeScene, Sonar, or new binaries.

| Signal | Done |
|--------|------|
| Hotspot (churn × current LOC) | |
| Temporal coupling (co-change among top churn paths) | |
| Knowledge (commit authors per path) | |

## Session notes

- Session A: `agent-arch-drift`. Stop at this handover. Do not call Linear.
- Human gate: Operator column `file` or `skip`. Unconfirmed rows stay skip.
- Session B: `agent-user-stories` on `default` MCP. One epic per scan (reuse an open complexity epic if it exists). One child per `file` row.
