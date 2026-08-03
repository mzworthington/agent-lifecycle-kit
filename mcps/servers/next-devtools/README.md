# Next.js DevTools MCP

Vercel `next-devtools-mcp` discovers running Next.js 16+ apps and proxies `/_next/mcp` (routes, errors, logs, runtime tools).

## Auth

None. Start the Next.js dev server (`npm run dev`); the MCP connector finds it on common ports.

Requires Next.js 16+ (built-in MCP endpoint).

## When to use

- Debugging App Router / RSC issues while implementing
- Inspecting live routes and runtime errors during TDD/XFN

Project-scoped (`devtools` or `project-example`) — useless without a local Next app.
