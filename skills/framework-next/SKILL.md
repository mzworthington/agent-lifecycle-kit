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
