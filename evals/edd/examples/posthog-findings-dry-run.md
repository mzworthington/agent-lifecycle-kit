# PostHog findings (waykit.dev dry-run)

Format fixture for [product-signal-intake](../../../SOPs/product-signal-intake.md). First live site: **waykit.dev** (this kit’s public Astro site; cookieless PostHog already wired).

This session had no PostHog MCP OAuth, so evidence cells are `n/a — no MCP`. Replace them after Session A (`wk mcp posthog`) before any human gate. Do not treat this table as live proof. Do not file Linear issues from it.

| Field | Value |
|-------|-------|
| **Project** | waykit |
| **Date** | 2026-09-04 |
| **Evidence window** | n/a — no MCP this session |
| **Status** | intake |

## Rows

| Signal | Evidence window (no project keys) | Kind | Size | Proposed next agent | Operator (file / skip) |
|--------|-----------------------------------|------|------|---------------------|------------------------|
| Empty or dropping `$pageview` on docs vs landing | n/a — no MCP | contract | sitting | agent-user-stories | skip |
| Error cluster on `/docs/edd` or `/SOPs/*` | n/a — no MCP | bug | sitting | agent-debug | skip |
| Flag exposure vs a timeboxed leading indicator (if any open bet) | n/a — no MCP | bet | epic | agent-prd | skip |

Three classified rows. Operator column stays **skip** until a Session A MCP query fills evidence and a human marks `file`.

## Query coverage

| Query | Done |
|-------|------|
| Errors / error clusters | n/a — PostHog MCP not installed in this session |
| Empty or dropping events | n/a — same |
| Funnel drop-offs | n/a — same |
| Flag exposure vs leading indicator | n/a — same |
| Timeboxed bets due | n/a — same |

## Session notes

- Session A profile: `wk mcp posthog` (not run; tools missing)
- Restore: `wk mcp default` before Session B
- Linear create: blocked — no confirmed rows, no Linear MCP
- SOP gap from this pass: none in the table shape; live evidence still requires OAuth
