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

Included in the `default` profile (`./install.sh` / `wk mcp default --install`). OAuth on first tool use in Cursor. Notion and Slack stay on `collab` so those tool schemas are not always loaded.
