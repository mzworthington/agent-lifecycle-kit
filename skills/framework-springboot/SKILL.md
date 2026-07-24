---
name: framework-springboot
description: >-
  Applies Spring Boot hexagonal layering, constructor injection, JPA adapter
  separation, DTO validation, and Problem Details errors. Use in Spring Boot,
  Spring MVC, Spring Data JPA, or @RestController codebases.
kind: profile
phase: stack
triggers:
  - spring boot
  - spring
  - restcontroller
  - spring data jpa
depends-on:
  - lang-java
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Spring Boot Framework Gold Standards

Apply these rules strictly when writing Spring Boot application code:

## 1. Hexagonal layers

- **Controllers** — Validate DTOs, delegate to application services, map responses.
- **Repositories** — JPA/DB strictly in adapters. Domain uses port interfaces only.
- **Services** — Business orchestration; depend on ports, not concrete infrastructure.

## 2. Dependency injection

- Constructor injection only. No `@Autowired` on fields.
- Avoid mixing `@Component` and manual `@Bean` ambiguously.

## 3. JPA and domain purity

- Do not expose `@Entity` outside the DB adapter. Map to domain models in repository implementations.
- Avoid cascade abuse and lazy-loading traps.

## 4. Validation & errors

- Jakarta Validation on request DTOs (`@Valid`, `@NotNull`, …).
- `@RestControllerAdvice` → RFC 7807 Problem Details. No internal exception leakage.

## 5. Testing

- `@WebMvcTest` for controllers; mock services with `@MockBean`.
- JUnit/Mockito for domain — no `@SpringBootTest` for pure logic.
- `@DataJpaTest` + Testcontainers/H2 for repository adapters only.
