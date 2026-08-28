---
name: framework-fastapi
description: >-
  Applies FastAPI patterns with thin route adapters, dependency-injected ports,
  Pydantic request models at the edge, and vertical-slice handlers. Use when
  working in FastAPI apps, APIRouter modules, or Python ASGI APIs.
kind: profile
phase: stack
triggers:
  - fastapi
  - apirouter
  - uvicorn
  - starlette
  - pydantic
depends-on:
  - lang-python
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# FastAPI Gold Standards

- **Routes are adapters** - Path operations map DTOs and call use-case handlers; no business rules in router functions.
- **Vertical slices** - One router/handler cluster per capability under `features/<slice>/`.
- **DI** - Inject ports via `Depends`; bind concrete adapters in composition root only.
- **Validation** - Pydantic models at the HTTP edge; domain types inward.
- **Async** - Use async endpoints for I/O-bound adapters; keep domain CPU logic plain functions when possible.

## Testing (XFN defaults)

Owned by [agent-xfn](../agent-xfn/SKILL.md); prefer repo tools if present:

- **API / E2E** - `httpx` ASGI tests; Playwright when a UI exists
- **Accessibility** - axe on UI surfaces when present
- **Security regression** - Authz/abuse cases around routes and dependencies
- **Load** - k6 against critical routes when SLOs exist
