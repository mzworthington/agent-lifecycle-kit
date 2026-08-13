---
title: Release checklist
kind: sop
triggers:
  - release
  - ship
  - changelog
  - version
tools:
  - shell
---
# Standard Operating Procedure: Release

Use with [agent-release](../skills/agent-release/SKILL.md).

## 1. Quality gates

- [ ] Functional impact map aligned; no silent catalog rewrites
- [ ] XFN matrix complete; every **apply** row green or BLOCKED with owner
- [ ] Security + arch-drift findings addressed or explicitly deferred
- [ ] Pre-commit / CI green on the release revision

## 2. Human-facing package

- [ ] Conventional **PR title** ([conventional-commits.md](./conventional-commits.md)); squash-and-merge uses it on the default branch
- [ ] Changelog / release notes: user-visible behavior, migrations, flags
- [ ] Rollback: previous version / flag off / migration reverse notes

## 3. Ops handoff

- [ ] Load SLOs mapped to telemetry (or N/A) per `handover_telemetry.md`
- [ ] Docs/runbooks updated when operators or public API changed ([agent-docs](../skills/agent-docs/SKILL.md))
- [ ] Report catalog + XFN summary to the user before calling Release COMPLETE
