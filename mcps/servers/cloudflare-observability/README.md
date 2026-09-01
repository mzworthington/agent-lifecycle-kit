# Cloudflare Observability MCP

Official remote Workers Observability MCP at `https://observability.mcp.cloudflare.com/mcp` (OAuth).

Typed tools for Worker logs and metrics — complementary to the Code Mode API server (`cloudflare`), which lists/mutates account resources.

## Auth

OAuth via Cursor on first use. Grant account scopes needed to read Worker logs.

## When to use

- [agent-cloudflare-ops](../../../skills/agent-cloudflare-ops/SKILL.md): beacon Worker errors, empty RUM ingest, invocation search
- [agent-debug](../../../skills/agent-debug/SKILL.md) / [agent-incident](../../../skills/agent-incident/SKILL.md): live Worker failures when the Cloudflare ops profile is installed

Prefer `observability_keys` / `observability_values` before `query_worker_observability` filters.

## Risks

Do not paste API tokens, site tokens, or raw PII from logs into handovers or memory MCP.
