# Context7 MCP

Pulls current library documentation and examples so agents do not rely on stale training data for framework APIs.

## Auth

None required for the default public endpoint.

## When to use

- Implementing against a library/framework API (Next.js, Spring, Prisma, etc.)
- Checking current package APIs during TDD/XFN tooling setup

## Cursor fragment

Composed from `server.json` → key `context7` via `npx -y @upstash/context7-mcp`.
