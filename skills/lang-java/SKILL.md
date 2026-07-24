---
name: lang-java
description: >-
  Enforces Java 21+ patterns, DDD-friendly records and POJOs, vertical-slice
  feature packages, and constructor injection. Use when writing or reviewing
  Java code, Maven/Gradle projects, JUnit tests, or Spring/Quarkus backends.
kind: profile
phase: stack
triggers:
  - java
  - junit
  - maven
  - gradle
  - record
depends-on: []
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Java Coding Philosophy

Apply these rules strictly when writing Java code:

- **Modern standards** - Java 21+ (pattern matching, records, virtual threads where appropriate).
- **Domain purity (DDD)** - Domain entities are pure POJOs with behavior on aggregates. No Spring, Jakarta, JPA, or Jackson annotations in core.
- **Value objects** - Use `record` for value objects, DTOs at boundaries, and domain events.
- **Vertical slices** - Package by feature (`orders.submit`, `import.diagram`) not only by layer (`service`, `repository`).
- **Dependency injection** - Constructor injection only. No `@Autowired` on fields.
