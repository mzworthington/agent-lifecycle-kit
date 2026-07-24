---
name: framework-quarkus
description: >-
  Applies Quarkus RESTEasy Reactive, vertical-slice resources and handlers,
  Panache repository pattern, CDI injection, and GraalVM reflection registration.
  Use in Quarkus, RESTEasy Reactive, or native-image projects.
kind: profile
phase: stack
triggers:
  - quarkus
  - resteasy
  - panache
  - graalvm
  - native image
depends-on:
  - lang-java
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Quarkus Framework Gold Standards

Apply these rules strictly when writing Quarkus application code:

## 1. Hexagonal layers & vertical slices

- **REST endpoints** - One resource method per slice; validate, call handler, map DTOs.
- **Handlers** - Application-layer handlers per feature, co-located in feature packages.
- **Panache** - `PanacheRepository<T>` in infrastructure only. No Quarkus types in domain core.

## 2. CDI

- Constructor injection. Explicit scopes (`@ApplicationScoped`, `@RequestScoped`).

## 3. Native / GraalVM

- `@RegisterForReflection` for serialized/reflected types (DTOs, custom exceptions).
- Avoid static initializers that assume runtime-only information.

## 4. Validation & errors

- Jakarta Bean Validation on REST resources.
- `ExceptionMapper<T>` for consistent RFC 7807-style errors at the boundary.

## 5. Testing

- JUnit 5 + Mockito for domain (no `@QuarkusTest` for pure logic).
- `@QuarkusTest` + `@InjectMock` for REST and DB integration.
- `@QuarkusIntegrationTest` for native binary verification.
