# Cloudflare MCP (Code Mode)

Official remote Cloudflare API MCP at `https://mcp.cloudflare.com/mcp`. Three tools, ~1k tokens of schema: `search` (find endpoints), `execute` (call `cloudflare.request()`), `docs` (developer docs).

Do **not** disable Code Mode (`?codemode=false`) in kit profiles — that registers ~2,500 tools and blows the context budget.

Workers logs live on the sibling server [cloudflare-observability](../cloudflare-observability/README.md).

## Auth

OAuth via Cursor on first use. Grant only the account scopes you need (Account Settings Read for RUM site list; Workers Scripts Read/Write for beacon Workers).

Docs-only alternative (no account mutations): `https://docs.mcp.cloudflare.com/mcp`.

## When to use

- [agent-cloudflare-ops](../../../skills/agent-cloudflare-ops/SKILL.md): list RUM sites, Workers, DNS; GraphQL analytics; compare live vs IaC
- Adapter work: Workers / Pages / DNS / R2 lookups while implementing

Use the `cloudflare-ops` profile for diagnosis, or `cloud` for Workers/Pages plus Vercel.

## Mutation rule

Resources declared in Pulumi (product `infra/cloudflare` or `edge-dns`) are **fixed in IaC**, not via `execute` write calls. MCP writes are only for inventory the stack does not own, and only with explicit user approval.

## Risks

Never store `siteToken`, API tokens, or OAuth codes in handovers or memory MCP.
