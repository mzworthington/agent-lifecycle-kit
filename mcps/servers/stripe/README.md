# Stripe MCP

Official remote MCP at `https://mcp.stripe.com` (OAuth). Prefer Restricted API Keys if using local `@stripe/mcp` instead.

## When to use

- [agent-tdd](../../../skills/agent-tdd/SKILL.md) gear 2 / [agent-adapter](../../../skills/agent-adapter/SKILL.md) payment ports
- Docs lookup while designing billing adapters

## Auth

OAuth in Cursor, or Bearer restricted key for non-OAuth clients. Never commit secret keys.

## Risks

Enable human confirmation for write tools. Prefer test-mode keys in development.
