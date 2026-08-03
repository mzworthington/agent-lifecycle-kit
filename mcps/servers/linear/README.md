# Linear MCP

Official Linear remote MCP. Agents can read issues, update status, and create tickets without leaving Cursor.

## Auth

OAuth via Cursor on first use. No API key in `mcp.json`.

If your host cannot use remote HTTP MCP, bridge with:

```json
{
  "command": "npx",
  "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]
}
```

## When to use

- Pulling acceptance criteria from a Linear issue during spec/impl
- Creating follow-up tickets after a bugfix or audit finding
- Checking board status while scoping work

Prefer project or `collab` profiles so every workspace does not always load issue-tracker tools.
