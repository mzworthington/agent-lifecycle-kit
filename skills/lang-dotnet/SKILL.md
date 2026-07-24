---
name: lang-dotnet
description: >-
  Enforces .NET 8/9+ conventions, DDD domain purity, vertical-slice feature
  folders, EF Core fluent mapping outside domain, and nullable reference safety.
  Use when writing or reviewing C#, .NET, or xUnit projects.
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

- **Modern standards** - .NET 8/9+; file-scoped namespaces, primary constructors where appropriate.
- **Domain purity (DDD)** - Rich domain model in core; no EF attributes on domain objects. Use `IEntityTypeConfiguration<T>` in infrastructure.
- **Vertical slices** - Feature folders with `*Command`, `*Handler`, and `*Validator` co-located (MediatR-style or equivalent).
- **Ports & adapters** - Inbound handlers implement use cases; outbound systems behind `I*` interfaces.
- **Null safety** - `#nullable enable` globally; treat nullability warnings as errors.
