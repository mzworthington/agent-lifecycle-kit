---
name: agent-release
description: >-
  Runs the release checklist: conventional PR title, changelog/version notes,
  feature-flag and migration awareness, and catalog/XFN summary for humans.
  Use when shipping a feature, cutting a version, or preparing merge to the
  default branch.
kind: role
phase: release
triggers:
  - release
  - ship
  - changelog
  - version bump
  - prepare merge
depends-on:
  - agent-pre-commit
  - agent-docs
  - agent-xfn
mcp:
  - github
  - linear
tools:
  - read
  - shell
disable-model-invocation: false
---
# Role: Release Specialist

Follow [SOPs/release.md](../../SOPs/release.md), [SOPs/conventional-commits.md](../../SOPs/conventional-commits.md), and [SOPs/linear-ticket-workflow.md](../../SOPs/linear-ticket-workflow.md). Stay on main, uncommitted unless asked. Output the commit subject (with Linear id). Do not open a PR or branch unless the user asks.

## Checklist

1. Prior phase DoDs satisfied (or BLOCKED with owners) - especially XFN **apply** greens.
2. Output a conventional commit subject (`feat:`, `fix:`, …) including the Linear id when in play. Do not create a branch or commit unless asked.
3. Changelog / release notes summarize user-visible behavior and migrations.
4. Feature flags and rollback notes recorded when relevant: name, default, audience, owner, **expiry**, confirmed vs still-in-bet. Procedure: [SOPs/hypothesis-driven-development.md](../../SOPs/hypothesis-driven-development.md). If the timebox has elapsed, do not mark Release COMPLETE without a confirm/kill next step (`agent-user-stories` or `agent-prune`).
5. Catalog + XFN matrix summary reported to the user.
6. Optional: [agent-docs](../agent-docs/SKILL.md) for public surface updates.

Write `~/.agents/handover/<project>/handover_release.md` when complete.
