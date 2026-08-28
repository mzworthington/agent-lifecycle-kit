---
name: framework-react
description: >-
  Framework profile for modern React 19 single-page applications (Vite, SPA).
  Enforces clean component hierarchy, hook isolation, strict immutability, state boundaries,
  accessibility (a11y), and client adapter best practices.
kind: profile
triggers:
  - react
  - react19
  - hooks
  - vite react
  - react component
  - usecontext
depends-on:
  - lang-typescript
tools:
  - read
  - write
disable-model-invocation: false
---
# Profile: React 19 & SPA Framework Standards

This profile defines architectural and implementation standards for client-side React applications.

## Core Directives

1. **Component Separation & Cohesion**:
   - Separate presentational UI components from application state hooks and domain adapters.
   - Keep components focused on a single responsibility; extract sub-components when JSX trees exceed ~100 lines.

2. **Hook Design & Immutability**:
   - Custom hooks (`use<Feature>`) encapsulate non-UI state logic, side effects, and API integrations.
   - Treat state as strictly immutable; never mutate state objects directly. Use functional setters or immutable state helpers.
   - Keep effect dependencies precise (`useEffect`); avoid unnecessary side effects by computing derived state directly during render.

3. **State Boundaries & Performance**:
   - Keep state co-located as close as possible to where it is used. Avoid bloated global contexts.
   - Wrap dynamic async states with error boundaries and suspense loading states.

4. **Accessibility & Design System**:
   - Use semantic HTML tags (`<main>`, `<nav>`, `<article>`, `<button>`).
   - Include ARIA attributes (`aria-label`, `aria-expanded`, `aria-describedby`) for interactive UI controls lacking default native semantics.
   - Enforce keyboard navigation support (`onKeyDown` paired with `onClick`).
