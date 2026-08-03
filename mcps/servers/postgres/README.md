# PostgreSQL MCP

Read-only Postgres access (`@modelcontextprotocol/server-postgres`): schema resources plus SQL in a read-only transaction.

## Auth / connection

```bash
export DATABASE_URL='postgresql://user:pass@localhost:5432/mydb'
```

Point at a **local or read-replica** URL. Do not point agents at writable production primaries.

## When to use

- Inspecting schema while implementing adapters or migrations
- Verifying query shapes during TDD / XFN data checks
- Audit of stored data shapes without ad-hoc psql sessions

Keep this in project profiles only — connection strings are environment-specific.
