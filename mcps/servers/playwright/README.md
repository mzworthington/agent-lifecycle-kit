# Playwright MCP

Browser automation suitable for XFN browser E2E and exploratory UI verification.

## Auth

None. Requires a local Node/npm toolchain; first run may download browser dependencies.

## When to use

- agent-xfn browser E2E apply cases
- Manual/agent-driven UI smoke after wiring adapters
- Capturing screenshots for visual confirmation

Prefer project-scoped install (`.cursor/mcp.json`) over the global default profile so every workspace does not pay the browser startup cost.

## Cursor fragment

Composed from `server.json` → key `playwright` via `npx -y @playwright/mcp@latest`.
