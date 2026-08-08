# Cloudflare MCP

Official remote Cloudflare API MCP at `https://mcp.cloudflare.com/mcp` (Code Mode / broad API surface).

## Auth

OAuth via Cursor on first use. Grant only the account scopes you need.

Docs-only alternative (no account mutations): `https://docs.mcp.cloudflare.com/mcp`.

## When to use

- Workers / Pages / DNS / R2 changes during adapter work
- Looking up live Cloudflare account resources while implementing
- Live-site diagnosis: confirm Worker/route/bindings while following
  [SOPs/cloudflare-observability-and-diagnosis.md](../../../SOPs/cloudflare-observability-and-diagnosis.md)
  (prefer read-only scopes until a mutation is explicitly required)

Use the `cloud` profile or add to a project `.cursor/mcp.json`.

For instrumentation and SLO mapping on Cloudflare-hosted apps, see
[agent-telemetry](../../../skills/agent-telemetry/SKILL.md) plus the same SOP §1.
Prefer official Cloudflare skills (`gh skill` / [external.lock.json](../../../skills/external.lock.json))
for Wrangler and platform conventions — do not vendor those into kit `skills/`.
