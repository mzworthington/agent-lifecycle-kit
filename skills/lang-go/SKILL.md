---
name: lang-go
description: >-
  Enforces idiomatic Go, hexagonal layout with interfaces at boundaries,
  vertical-slice feature packages, and table-driven tests. Use when writing or
  reviewing Go services, modules, or go.mod projects.
kind: profile
phase: stack
triggers:
  - golang
  - go mod
  - go test
depends-on: []
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Go Coding Philosophy

Apply these rules strictly when writing Go:

- **Interfaces at the edge** - Define small interfaces where used (often in the consumer package); keep domain packages free of DB/HTTP driver imports.
- **Domain purity** - Business rules in `internal/domain` (or equivalent) without ORM/HTTP frameworks.
- **Vertical slices** - Feature packages own handlers and tests; shared domain types stay thin.
- **Errors** - Wrap with context (`fmt.Errorf("…: %w", err)`); map to transport errors only in adapters.
- **Concurrency** - Prefer clarity over clever channel graphs; cancel via `context.Context`.

## Testing defaults

| Layer | Default |
|-------|---------|
| Unit / slice | `go test` table-driven tests |
| Browser E2E | Playwright against UI if present |
| Accessibility | axe on UI when present; otherwise skip |
| Security regression | Handler-level authz/abuse tests |
| Load / performance | k6 |
