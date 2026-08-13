---
name: profile-api
description: >-
  Cross-stack rules for public HTTP and event APIs: versioning, idempotency,
  error envelopes, pagination, and contract-first changes. Use when designing or
  reviewing REST/GraphQL/webhook APIs across languages.
kind: profile
phase: stack
triggers:
  - rest api
  - graphql
  - webhook
  - idempotency
  - api versioning
depends-on:
  - agent-api-contract
tools:
  - read
  - write
disable-model-invocation: false
---
# API Boundary Profile

- **Contract-first** - Follow [SOPs/api-contracts.md](../../SOPs/api-contracts.md) and [agent-api-contract](../agent-api-contract/SKILL.md).
- **Versioning** - Prefer additive changes; explicit version or compatible evolution for breaks.
- **Idempotency** - Mutating endpoints that can retry need idempotency keys or natural idempotent semantics.
- **Errors** - Stable problem/error envelope at the adapter; domain failures mapped once.
- **Pagination** - Cursor or documented offset; never unbounded list endpoints for user-facing APIs.
- **Authn/z** - Deny by default; document security schemes in the contract.
