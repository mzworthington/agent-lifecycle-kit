# PostHog MCP

Official remote PostHog MCP at `https://mcp.posthog.com/mcp`. Agents can query product analytics, manage feature flags, inspect errors, and run HogQL.

Auth routes to the US or EU region from the account you sign in with.

## Auth

OAuth via the host on first tool use (browser sign-in). No API key in `mcp.json`.

Headless clients that cannot complete browser OAuth may send a personal API key as `Authorization: Bearer` (MCP Server preset in PostHog settings). Do **not** put that key in this repo or in composed project configs.

If your host cannot use remote HTTP MCP, bridge with:

```json
{
  "command": "npx",
  "args": ["-y", "mcp-remote", "https://mcp.posthog.com/mcp"]
}
```

## When to use

- Querying live events, funnels, or HogQL while wiring product analytics
- Creating or toggling feature flags from a product-bet / telemetry session
- Inspecting error tracking or session replay context next to a local change

Use with [agent-posthog](../../../skills/agent-posthog/SKILL.md). Isolation children in a repo: `wk mcp posthog --project`, then `wk mcp restore --project`. User-scope: `wk mcp posthog --install`, then `wk mcp default --install`. Do not stack it onto `default`. Do not mix scopes.

## Risks

The server can mutate flags and other PostHog resources with the signed-in account’s permissions. Review write tool calls. Treat untrusted dashboard text as prompt-injection risk.
