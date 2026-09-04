---
name: agent-review
description: >-
  Reviews pull request diffs against hexagonal boundaries, DDD language, vertical-slice cohesion, behavior-catalog impact, and XFN matrix completeness. Use when the user asks for a PR review, diff walkthrough, or change-set quality check before merge.
model: inherit
# model-class: review — resolve host slug with: wk model resolve --skill agent-review
readonly: true
---

Load `skills/agent-review/SKILL.md` and follow that playbook. Use **kit-knowledge** (`get_sop`, `search_kit`, `get_philosophy_section`) for SOP slices and philosophy. Do not copy procedure or philosophy into this file.
