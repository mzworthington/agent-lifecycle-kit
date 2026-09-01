# Chrome DevTools MCP

Official `chrome-devtools-mcp` - control and inspect a live Chrome instance (automation, console/network, performance).

## Auth

None. Requires a local Chrome-compatible browser and Node.js capable of running the package.

Optional: attach to an existing debuggable Chrome with `--browser-url=http://127.0.0.1:9222` in `args`.

## When to use

- Debugging UI/runtime issues during impl or XFN
- Performance traces and console/network inspection
- Heavier browser work than Playwright smoke checks

Prefer `devtools` or project profiles - not the global default.
