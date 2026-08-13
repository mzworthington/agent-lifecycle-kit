# Semgrep MCP

Runs Semgrep via `uvx semgrep-mcp` (stdio). Hosted experimental endpoint also exists at `https://mcp.semgrep.ai/mcp` if you prefer HTTP.

## When to use

- [agent-security](../../../skills/agent-security/SKILL.md) audits
- Pre-release scans on touched paths

## Auth

Core scanning needs no token. AppSec Platform features may need `SEMGREP_APP_TOKEN` (never commit it).

## Risks

SAST findings are advisory until confirmed; do not auto-suppress catalog security tests based on scan noise alone.
