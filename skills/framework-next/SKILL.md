---
name: framework-next
description: >-
  Applies Next.js App Router patterns with vertical-slice server actions,
  RSC-by-default, thin route adapters, and minimal client state. Use when
  working in Next.js projects, app/ directory, React Server Components,
  or server actions.
kind: profile
phase: stack
triggers:
  - next.js
  - nextjs
  - app router
  - rsc
  - server action
depends-on:
  - lang-typescript
tools:
  - read
  - write
disable-model-invocation: false
---
# Next.js Web Framework Gold Standards

Apply these rules strictly when writing Next.js (App Router) code:

- **Vertical slices** - One server action or route handler per capability; delegate to a feature handler in `features/<slice>/`, not fat route files.
- **Architecture** - `/app` is the delivery adapter. Routes compose handlers/use cases only.
- **Server components by default** - RSC for data fetching. `'use client'` only at leaf nodes.
- **Data & mutations** - Fetch in RSCs with cache tags. Mutations via server actions through domain validation.
- **Client state** - Avoid global stores unless necessary. Prefer URL state and server-driven layouts.

## Testing (XFN defaults)

Owned by [agent-xfn](../agent-xfn/SKILL.md); prefer repo tools if present:

- **Browser E2E** - Playwright against App Router routes; prefer `getByRole` / labels over brittle selectors.
- **Accessibility** - `@axe-core/playwright` on touched pages; keep `eslint-plugin-jsx-a11y` in lint.
- **Security regression** - Authz and abuse cases around server actions and route handlers.
- **Load** - k6 against critical server actions or Route Handlers when SLOs exist.
