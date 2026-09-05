---
name: lang-csharp
description: >-
  Enforces C# language conventions, DDD-friendly records and classes, vertical-
  slice feature folders, nullable reference safety, and constructor injection.
  Use when writing or reviewing C# source, .cs files, or .csproj projects.
kind: profile
phase: stack
triggers:
  - csharp
  - c#
  - csproj
  - record
depends-on: []
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# C# Coding Philosophy

Apply these rules strictly when writing C# code:

- **Modern standards** - C# 12+ (records, pattern matching, file-scoped namespaces, primary constructors where appropriate).
- **Domain purity (DDD)** - Rich domain model in core; no framework or persistence attributes on domain types.
- **Value objects** - Use `record` or `readonly struct` for value objects, boundary DTOs, and domain events.
- **Vertical slices** - Package by feature (`Orders.Submit`, `Import.Diagram`) not only by layer (`Services`, `Repositories`).
- **Dependency injection** - Constructor injection only. No service locator or field injection.
- **Null safety** - `#nullable enable` globally; treat nullability warnings as errors.
- **No narrative comments** - Names and tests document why ([CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §4). Do not add XML docs that restate the signature.

## Testing defaults

Prefer project-existing tools; otherwise these defaults for [agent-tdd](../agent-tdd/SKILL.md) / [agent-xfn](../agent-xfn/SKILL.md):

| Layer | Default |
|-------|---------|
| Unit / slice | xUnit |
| API / browser E2E | `WebApplicationFactory<T>` for HTTP; Playwright when a UI exists |
| Accessibility | axe on UI surfaces when present; otherwise skip with rationale |
| Security regression | xUnit authz/abuse cases; OWASP ZAP only if CI already has it |
| Load / performance | NBomber (or k6 if already standardized) |
