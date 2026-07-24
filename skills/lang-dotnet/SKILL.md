---
name: lang-dotnet
description: >-
  Enforces .NET 8/9+ conventions, EF Core fluent mapping outside domain,
  ports-and-adapters layout, and nullable reference safety. Use when writing
  or reviewing C#, .NET, or xUnit projects.
kind: profile
phase: stack
triggers:
  - csharp
  - c#
  - dotnet
  - .net
  - xunit
  - ef core
depends-on: []
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# C# / .NET Coding Philosophy

Apply these rules strictly when writing C# or .NET code:

- **Modern standards** — .NET 8/9+; file-scoped namespaces, primary constructors where appropriate.
- **Domain purity** — No EF Core in domain. No `[Key]` / `[Required]` on domain objects. Use `IEntityTypeConfiguration<T>` in infrastructure.
- **Ports & adapters** — Clear inbound use cases (e.g. `ICommandHandler<TCommand>`). Outbound systems behind `I*` interfaces.
- **Null safety** — `#nullable enable` globally; treat nullability warnings as errors.
