# Bitwarden MCP

Official `@bitwarden/mcp-server` — vault access through the local Bitwarden CLI (zero-knowledge; credentials stay on the machine).

## Auth

1. Install and log in with the [Bitwarden CLI](https://bitwarden.com/help/cli/).
2. Unlock and export a session for the Cursor process:

```bash
export BW_SESSION="$(bw unlock --raw)"
```

Optional org admin APIs: `BW_CLIENT_ID`, `BW_CLIENT_SECRET` (local override only).

## Security

- Prefer a **local / self-hosted LLM** when retrieving secrets via agents (Bitwarden guidance).
- Never commit `BW_SESSION` or vault contents.
- Keep this server in the `personal` profile, not shared project configs that auto-install for teammates.

## When to use

- Fetching a local secret the agent must use for a one-off integration test
- Generating/storing credentials during local setup (with human approval)
