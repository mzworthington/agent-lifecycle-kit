---
title: API contracts (OpenAPI / AsyncAPI)
kind: sop
triggers:
  - openapi
  - asyncapi
  - api contract
  - breaking change
  - webhook
tools:
  - read
  - write
  - shell
---
# Standard Operating Procedure: API Contracts

Use with [agent-api-contract](../skills/agent-api-contract/SKILL.md) and [profile-api](../skills/profile-api/SKILL.md).

## 1. Locate the source of truth

- Prefer the repo’s existing OpenAPI/AsyncAPI (or GraphQL schema) path.
- If none exists and the API is public, add a contract artifact before coding adapters.

## 2. Change taxonomy

| Change | Allowed pattern |
|--------|-----------------|
| Additive (new optional field, new endpoint) | Ship with tests; document examples |
| Compatible tighten (more enum values consumers already ignore) | Document; add consumer tests if known |
| Breaking (remove/rename field, change type, stricter required) | Version bump or coordinated consumer migration; explicit notes in PR |

## 3. Catalog alignment

- Map each operation to slice/API tests (and XFN security rows when authz changes).
- Do not claim “documented” behavior that tests do not cover.

## 4. Review gates

- [ ] Diff of contract reviewed for accidental breaks
- [ ] Error envelope and auth schemes unchanged or intentionally versioned
- [ ] Idempotency documented for retried POSTs
- [ ] [agent-tdd](../skills/agent-tdd/SKILL.md) owns behavior implementation after the contract draft
