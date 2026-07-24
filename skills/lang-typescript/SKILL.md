---
name: lang-typescript
description: >-
  Enforces strict TypeScript typing, hexagonal ports-and-adapters layout, domain
  purity, and Zod boundary validation. Use when writing or reviewing TypeScript
  or Node.js code, .ts/.tsx files, or when the project uses npm/pnpm workspaces.
kind: profile
phase: stack
triggers:
  - typescript
  - node
  - tsx
  - vitest
  - jest
  - zod
depends-on: []
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# TypeScript / Node.js Coding Philosophy

Apply these rules strictly when writing TypeScript or Node.js code:

- **Strict typing** — Enable strict mode. Never use `any`. Use `unknown` or explicit generics for dynamic contracts.
- **Ports & adapters** — Driving ports as interfaces (e.g. `CreateOrderUseCase`). Driven ports as interfaces; use DI tokens or functional injection for implementations.
- **Domain purity** — No TypeORM, Prisma, or class-validator decorators in domain entities.
- **Validation** — Zero-trust parsing at infrastructure boundaries with `Zod` or `ArkType` before data reaches use cases.
