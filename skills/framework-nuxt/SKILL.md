---
name: framework-nuxt
description: >-
  Applies Nuxt 3 patterns: SSR-safe data fetching, thin server routes,
  Nitro API boundaries, and limited Pinia. Use when working in Nuxt projects,
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

- **Architecture** — `/pages` and `/server` are delivery adapters. Extract business rules from composables and components.
- **Data fetching** — `useFetch` / `useAsyncData` with explicit keys for SSR hydration. No naked client `fetch` in `onMounted`.
- **Nitro** — Keep `/server/api` routes thin: validate (H3/Zod), call service layer, map outputs.
- **State** — `useState` for simple SSR-safe shared state; Pinia only for complex client-driven features.
