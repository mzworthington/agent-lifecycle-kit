---
name: lang-python
description: >-
  Enforces typed Python (3.11+), hexagonal ports-and-adapters, DDD domain
  purity, vertical-slice packages, and Pydantic boundary validation. Use when
  writing or reviewing Python, pytest, Poetry/uv projects, or FastAPI/Django
  backends.
kind: profile
phase: stack
triggers:
  - python
  - pytest
  - pydantic
  - poetry
  - uv
  - mypy
  - type hints
depends-on: []
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Python Coding Philosophy

Apply these rules strictly when writing Python:

- **Modern typing** - Python 3.11+; prefer explicit types and `mypy`/`pyright` strictness already in the repo. Avoid untyped public APIs.
- **Ports & adapters** - Protocols/ABCs for driven ports; handlers/use cases in feature packages; no SQLAlchemy/Django ORM in domain.
- **Domain purity (DDD)** - Aggregates and value objects in `domain/` / `core/` without framework decorators.
- **Vertical slices** - Co-locate handler, request/response models, and tests under `features/<capability>/`.
- **Validation** - Pydantic (or msgspec) at infrastructure boundaries before data reaches handlers.

## Testing defaults

| Layer | Default |
|-------|---------|
| Unit / slice | pytest (+ pytest-asyncio when needed) |
| Browser E2E | Playwright |
| Accessibility | axe on UI when present; otherwise skip with rationale |
| Security regression | pytest abuse/authz cases; Semgrep/ZAP if CI already has them |
| Load / performance | k6 (or locust if already standardized) |
