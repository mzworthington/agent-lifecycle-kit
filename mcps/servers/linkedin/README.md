# LinkedIn MCP

Community server `@pegasusheavy/linkedin-mcp` (no official LinkedIn MCP). Profile/post workflows via LinkedIn developer app OAuth.

## Auth

Create a LinkedIn developer app and export:

```bash
export LINKEDIN_CLIENT_ID='...'
export LINKEDIN_CLIENT_SECRET='...'
```

First run typically opens a browser OAuth flow. Alternatively set `LINKEDIN_ACCESS_TOKEN` in a local override instead of client credentials.

## When to use

- Drafting or publishing professional posts from agent sessions
- Reading profile context for content work

Keep in the `personal` profile only - not team defaults. Review posts before publish.
