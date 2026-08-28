---
name: framework-express
description: >-
  Framework profile for Express.js / Node.js backend services.
  Enforces middleware chaining, strongly-typed request schemas, async error handling wrappers,
  Helmet security headers, and clean adapter integration.
kind: profile
triggers:
  - express
  - expressjs
  - express router
  - node express
  - express middleware
depends-on:
  - lang-typescript
  - profile-api
tools:
  - read
  - write
disable-model-invocation: false
---
# Profile: Express.js Backend Framework Standards

This profile defines standards for Express.js REST APIs and backend microservices.

## Core Directives

1. **Routing & Architecture**:
   - Router handlers act as thin delivery adapters. They extract DTOs, invoke application use cases / ports, and return standard HTTP responses.
   - Do NOT mix SQL/ORM logic or domain rules directly inside route handlers.

2. **Input Validation & Type Safety**:
   - Validate incoming `req.body`, `req.params`, and `req.query` using schema validation (e.g. Zod or Ajv) in a reusable validation middleware.
   - Attach strongly-typed request payloads to custom Express request interfaces.

3. **Error Handling & Middleware**:
   - Wrap async route handlers to catch rejected promises automatically (e.g., using `express-async-handler` or native async error catching in Express 5+).
   - Use a single centralized error-handling middleware (`(err, req, res, next)`) to log errors and format standardized JSON error responses.

4. **Security & Production Readiness**:
   - Use `helmet()` middleware for default security HTTP headers.
   - Use `cors()` with explicit origin whitelists.
   - Enable rate limiting (`express-rate-limit`) on public authentication and sensitive endpoints.
