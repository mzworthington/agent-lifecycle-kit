---
name: framework-dotnet
description: >-
  Applies .NET 8/9+ platform patterns, ASP.NET Core delivery, EF Core adapter
  separation, MediatR-style handlers, and xUnit integration testing. Use in
  ASP.NET Core, Minimal API, Web API, EF Core, or .NET backend codebases.
kind: profile
phase: stack
triggers:
  - dotnet
  - .net
  - aspnetcore
  - asp.net
  - ef core
  - entity framework
  - mediatr
  - xunit
  - webapplicationfactory
depends-on:
  - lang-csharp
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# .NET Framework Gold Standards

Apply these rules strictly when writing .NET application code:

## 1. Hexagonal layers & vertical slices

- **Endpoints** - One route or controller action per slice; validate input, delegate to a single handler, map responses. No business logic at the HTTP edge.
- **Handlers** - One handler per feature (`SubmitOrderHandler`), not god-class `*Service` facades.
- **Persistence** - EF Core and external I/O strictly in adapters. Domain uses port interfaces only.

## 2. Dependency injection

- Constructor injection only via `IServiceCollection` / `WebApplicationBuilder`.
- Register handlers and adapters explicitly; avoid ambiguous lifetimes.

## 3. EF Core and domain purity

- No EF attributes on domain objects. Use `IEntityTypeConfiguration<T>` in infrastructure.
- Map between persistence models and domain types in repository implementations.
- Avoid lazy-loading traps and unbounded includes.

## 4. Validation & errors

- FluentValidation or data annotations on request DTOs at the adapter boundary.
- `IProblemDetailsService` or middleware for RFC 7807 Problem Details. No internal exception leakage.

## 5. Testing

- xUnit for domain and handler tests; no `WebApplicationFactory` for pure logic.
- `WebApplicationFactory<T>` or integration test projects for HTTP and adapter boundaries only.
