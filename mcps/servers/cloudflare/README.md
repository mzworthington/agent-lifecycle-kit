# Cloudflare MCP

Official remote Cloudflare API MCP at `https://mcp.cloudflare.com/mcp` (Code Mode / broad API surface).

## Auth

OAuth via Cursor on first use. Grant only the account scopes you need.

Docs-only alternative (no account mutations): `https://docs.mcp.cloudflare.com/mcp`.

## When to use

- Workers / Pages / DNS / R2 changes during adapter work
- Looking up live Cloudflare account resources while implementing

Use the `cloud` profile or add to a project `.cursor/mcp.json`.
