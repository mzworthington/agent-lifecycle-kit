---
name: framework-next
description: >-
  Applies Next.js App Router patterns: RSC-by-default, server actions for
  mutations, thin route adapters, and minimal client state. Use when working
  in Next.js projects, app/ directory, React Server Components, or server actions.
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

- **Architecture** — `/app` is the driving delivery adapter. Routes compose and invoke application ports/use cases only.
- **Server components by default** — RSC for data fetching. `'use client'` only at leaf nodes for interactivity.
- **Data & mutations** — Fetch in RSCs with cache tags. Mutations via server actions (`'use server'`) through domain validation.
- **Client state** — Avoid global client stores unless necessary. Prefer URL state and server-driven layouts.
