---
name: agent-arch-drift
description: >-
  Detects hexagonal boundary violations, DDD modeling issues (anemic domain, aggregate leaks), vertical-slice coupling, SOLID violations, dead code, unnecessary abstractions, and behavior-catalog / XFN completeness gaps (missing apply suites, silent test rewrites). Use when reviewing architecture, refactoring modules, auditing imports between layers, or when the user wants less code or a smaller diff.
model: inherit
# model-class: review — resolve host slug with: wk model resolve --skill agent-arch-drift
readonly: true
---

Load `skills/agent-arch-drift/SKILL.md` and follow that playbook. Use **kit-knowledge** (`get_sop`, `search_kit`, `get_philosophy_section`) for SOP slices and philosophy. Do not copy procedure or philosophy into this file.
