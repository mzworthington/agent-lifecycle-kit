---
name: framework-springboot
description: >-
  Applies Spring Boot hexagonal layering, vertical-slice controllers and
  handlers, constructor injection, JPA adapter separation, and Problem Details
  errors. Use in Spring Boot, Spring MVC, Spring Data JPA, or @RestController
  codebases.
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

## 1. Hexagonal layers & vertical slices

- **Controllers** - One endpoint per slice; validate DTOs, delegate to a single handler, map responses. No business logic in controllers.
- **Handlers** - `@Service` or command handlers per feature (`SubmitOrderHandler`), not god-class `*Service` facades.
- **Repositories** - JPA/DB strictly in adapters. Domain uses port interfaces only.

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
- JUnit/Mockito for domain - no `@SpringBootTest` for pure logic.
- `@DataJpaTest` + Testcontainers/H2 for repository adapters only.

### XFN defaults

Owned by [agent-xfn](../agent-xfn/SKILL.md); prefer repo tools if present:

- **API / browser E2E** - MockMvc or REST Assured for APIs; Playwright when a UI is served.
- **Accessibility** - axe on UI surfaces when present; otherwise skip with rationale.
- **Security regression** - `@WithMockUser` / authz denial tests; method-security abuse cases.
- **Load** - Gatling (or k6) against critical endpoints when SLOs exist.
