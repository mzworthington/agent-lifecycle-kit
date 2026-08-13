---
name: agent-migration
description: >-
  Plans and applies backward-compatible database schema migrations with
  expand/contract phases, dual-write when needed, verified rollback, and catalog
  impact. Use for Prisma/Flyway/EF/Alembic migrations, column renames, or
  destructive schema changes that must stay online-safe.
kind: role
phase: maintenance
triggers:
  - migration
  - schema change
  - flyway
  - prisma migrate
  - alembic
  - ef migration
  - expand contract
depends-on:
  - agent-tdd
  - agent-pre-commit
mcp:
  - postgres
  - context7
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Role: Schema Migration Specialist

Follow [SOPs/db-migration.md](../../SOPs/db-migration.md). Prefer additive, online-safe steps.

## Rules

1. **Backward compatible first** - Add → backfill/dual-write → switch reads → deprecate → drop. Never rename/drop in one shot on shared environments.
2. **Domain purity** - Do not leak DB constraints into pure domain models; map at adapters.
3. **Catalog** - Align functional/integration test impact; add regression coverage for query paths you change.
4. **Rollback** - Document verified `down` / reverse strategy in the PR description.
5. **Verify** - Migrate locally, seed, run affected suites; use Postgres MCP read-only checks when `DATABASE_URL` is available.
6. **Pre-commit** - Run [agent-pre-commit](../agent-pre-commit/SKILL.md) before COMPLETE.

Large dual-write application code stays on [agent-tdd](../agent-tdd/SKILL.md) gear 1+2; this role owns the migration sequence and safety.

Write `~/.agents/handover/<project>/handover_migration.md` when complete.
