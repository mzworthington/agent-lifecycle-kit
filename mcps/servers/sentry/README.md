# Sentry MCP

Official remote MCP at `https://mcp.sentry.dev/mcp` (OAuth). Scope to org/project in the URL when possible: `https://mcp.sentry.dev/mcp/{org}/{project}`.

## When to use

- [agent-debug](../../../skills/agent-debug/SKILL.md) / [agent-incident](../../../skills/agent-incident/SKILL.md): live errors, regressions
- [agent-telemetry](../../../skills/agent-telemetry/SKILL.md): correlate SLOs with production signals

## Auth

Cursor OAuth on first tool use. No tokens in this repo.

## Risks

Do not paste DSNs or auth tokens into handovers or memory MCP.
