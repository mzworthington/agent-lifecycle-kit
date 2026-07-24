---
name: lang-java
description: >-
  Enforces Java 21+ patterns, record-based value objects, POJO domain purity,
  and constructor injection. Use when writing or reviewing Java code, Maven/Gradle
  projects, JUnit tests, or Spring/Quarkus backends.
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

- **Modern standards** — Java 21+ (pattern matching, records, virtual threads where appropriate).
- **Domain purity** — Domain entities are pure POJOs. No Spring, Jakarta, JPA, or Jackson annotations in core. Map persistence entities in infrastructure.
- **Immutability** — Use `record` for value objects, DTOs, and domain events.
- **Dependency injection** — Constructor injection only. No `@Autowired` on fields.
