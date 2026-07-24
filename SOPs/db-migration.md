---
title: Database Schema Migrations
kind: sop
triggers:
  - migration
  - schema change
  - flyway
  - prisma migrate
tools:
  - shell
---
# Standard Operating Procedure: Database Schema Migrations

Follow these steps strictly when creating, verifying, and deploying a database schema migration.

## 1. Design Phase

- **Backward compatibility:** All migrations must be additive or backward-compatible. Never drop tables or rename columns directly. Use a multi-phase migration (Add → Populate/Write to Both → Deprecate → Drop) if altering columns.
- **Domain check:** Ensure the change does not leak database-specific constraints into the pure domain models.

## 2. Creation Phase

Generate the migration script using the framework-specific tool (e.g. Prisma CLI, EF Migrations, or Flyway SQL):

```bash
# Example for Prisma
npx prisma migrate dev --name <descriptive_migration_name>
```

## 3. Local Verification

- Run the migration locally: `npx prisma migrate deploy` (or equivalent).
- Seed local test data to verify schema constraints.
- Run the complete test suite to ensure no queries are broken by the schema adjustments.

## 4. Rollback Plan

Every migration file must be accompanied by a verified rollback strategy detailed in the pull request:

- Write the `down` SQL migration or verify the framework's automatic rollback behaves correctly.
- Document any data-loss risks.
