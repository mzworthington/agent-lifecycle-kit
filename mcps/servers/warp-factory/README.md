# Warp Factory MCP

Official remote Warp Factory MCP at `https://app.warp.dev/api/v1/mcp/factory`. Agents can list factories, send or continue factory tasks, talk to a task’s foreman, and walk a first-time factory setup.

This is Warp.dev factories, not freight quoting (`wearewarp.com`).

## Auth

OAuth via the host on first use (browser sign-in). No API key in `mcp.json`.

Headless / CI clients that cannot complete browser OAuth may pass a Warp agent API key as a bearer token. Do **not** put that key in this repo or in composed project configs; keep it in the host’s secret storage.

If your host cannot use remote HTTP MCP, bridge with:

```json
{
  "command": "npx",
  "args": ["-y", "mcp-remote", "https://app.warp.dev/api/v1/mcp/factory"]
}
```

## When to use

- Sending a local bug, review, or half-finished change into a factory (`send_task`)
- Pulling a factory task into this checkout (`get_task` with `start_working=true`) and handing the result back
- Listing or searching factory tasks, reading the foreman conversation, completing a task
- First-time factory onboarding (`list_teams` through `create_factory`)

Use the `warp` profile (`wk mcp warp --install` or `wk mcp warp --project`). Do not stack it onto `default`.

## Risks

Factory MCP has no read-only or per-factory scopes: a connected client acts with the full permissions of the signed-in account (or agent API key). Never commit bearer tokens. Factory MCP does not modify the local working tree; agents run git setup themselves after `get_task`.
