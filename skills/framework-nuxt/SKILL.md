---
name: framework-nuxt
description: >-
  Applies Nuxt 3 vertical-slice feature folders, SSR-safe data fetching, thin
  Nitro server routes, and limited Pinia. Use when working in Nuxt projects,
  useFetch, useAsyncData, or /server/api routes.
kind: profile
phase: stack
triggers:
  - nuxt
  - nitro
  - usefetch
  - useasyncdata
depends-on:
  - lang-typescript
tools:
  - read
  - write
disable-model-invocation: false
---
# Nuxt.js Web Framework Gold Standards

Apply these rules strictly when writing Nuxt.js code:

- **Vertical slices** - Co-locate page, composable, and server handler per feature under `features/<name>/`; keep `/pages` and `/server` as thin adapters.
- **Architecture** - `/pages` and `/server` are delivery adapters. Business rules live in feature handlers and domain code.
- **Data fetching** - `useFetch` / `useAsyncData` with explicit keys for SSR hydration. No naked client `fetch` in `onMounted`.
- **Nitro** - Keep `/server/api` routes thin: validate (H3/Zod), call service layer, map outputs.
- **State** - `useState` for simple SSR-safe shared state; Pinia only for complex client-driven features.

## Testing (XFN defaults)

Owned by [agent-xfn](../agent-xfn/SKILL.md); prefer repo tools if present:

- **Browser E2E** - Playwright against pages and critical flows.
- **Accessibility** - `@axe-core/playwright` on touched pages.
- **Security regression** - Authz/abuse cases for `/server/api` and protected pages.
- **Load** - k6 against Nitro endpoints when SLOs exist.
