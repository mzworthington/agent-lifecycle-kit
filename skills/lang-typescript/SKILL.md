---
name: lang-typescript
description: >-
  Enforces strict TypeScript typing, hexagonal ports-and-adapters layout, DDD
  domain purity, vertical-slice feature folders, and Zod boundary validation.
  Use when writing or reviewing TypeScript or Node.js code, .ts/.tsx files,
  or when the project uses npm/pnpm workspaces.
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

- **Strict typing** - Enable `strict`. Never use `any`, `as any`, or `as unknown as`. Reach for `unknown` plus a type guard/Zod parse, explicit generics, or `satisfies T`. Tests use typed fakes, `Partial<T>`, and `vi.fn<typeof impl>` - not `as any`. Vitest `expect.any(Number)` is a matcher, not a type `any`. Turn on `typescript/no-explicit-any` (oxlint or ESLint) as an error so this cannot regress.
- **Ports & adapters** - Driving ports as interfaces (e.g. `CreateOrderUseCase`). Driven ports as interfaces; use DI tokens or functional injection for implementations.
- **Domain purity (DDD)** - Aggregates and value objects in `domain/` with no TypeORM, Prisma, or class-validator decorators.
- **Vertical slices** - Co-locate `*Handler`, request/response types, and slice tests under `features/<capability>/`.
- **Validation** - Zero-trust parsing at infrastructure boundaries with `Zod` or `ArkType` before data reaches handlers.
- **No narrative comments** - Names and tests document why ([CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §4). Do not add JSDoc that restates the identifier.

## Testing defaults

Prefer project-existing tools; otherwise these defaults for [agent-tdd](../agent-tdd/SKILL.md) / [agent-xfn](../agent-xfn/SKILL.md):

| Layer | Default |
|-------|---------|
| Unit / slice | Vitest (or Jest if already in repo) |
| Browser E2E | Playwright |
| Accessibility | `@axe-core/playwright`; `eslint-plugin-jsx-a11y` for static UI |
| Security regression | Vitest/Playwright abuse and authz cases; OWASP ZAP only if CI already has it |
| Load / performance | k6 |
