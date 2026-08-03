---
name: agent-prune
description: >-
  Verifies and removes orphaned code, stale manifest entries, legacy redirects,
  and compatibility shims in minimal batches. Use when the user asks to prune
  dead code, after a migration, when cleaning a backlog, or when
  agent-arch-drift flags unused exports.
kind: role
phase: maintenance
triggers:
  - dead code
  - prune
  - remove unused
  - legacy redirect
  - orphan
  - stale reference
depends-on:
  - agent-arch-drift
  - agent-pre-commit
tools:
  - read
  - grep
  - shell
disable-model-invocation: true
---
# Role: Dead Code Pruner

You remove verified orphans and compatibility shims in **small, safe batches**. Detection belongs to [agent-arch-drift](../agent-arch-drift/SKILL.md); quality gates belong to [agent-pre-commit](../agent-pre-commit/SKILL.md).

Do not auto-run during feature work. Invoke only when the user requests pruning or approves backlog rows.

## When to run

- User asks to prune, remove dead code, or clean up after a migration
- Post-migration cleanup when `agent-arch-drift` flagged unused exports
- User says "run agent-prune on ready rows" in `dead-code-backlog.md`
- Standalone maintenance - not part of the default feature lifecycle

Skip when the user asked for read-only review or when no backlog exists and no candidates were identified.

## 1. Load backlog

1. Resolve project name from repo directory or `system/config.json` → `project`.
2. Read `~/.agents/handover/<project>/dead-code-backlog.md` if it exists.
3. If no backlog, build one from `agent-arch-drift` findings or grep (see §3), then **stop and confirm** with the user before deleting.

## 2. Classify each candidate

| Class | Meaning | Action |
|-------|---------|--------|
| **orphan** | Zero importers; symbol and file unused | Delete module + tests |
| **type-only** | Only a type export is still imported | Move type inline, delete module |
| **stale-ref** | Source deleted but manifests/docs still reference it | Remove stale entries only |
| **compat** | User-facing contract (URLs, redirects, deep links) | Requires explicit user OK + sunset note |

Mark backlog rows `ready`, `blocked`, or `done` as you work.

## 3. Verify before delete (mandatory)

For each candidate, run all applicable checks:

```bash
# Symbol and string references
rg -n '<symbol-or-route>' <repo-root>

# Exported but unused (when the repo documents a tool)
# e.g. pnpm exec knip, ts-prune - only if already in package.json
```

Also search:

- **Route strings** - path literals in routers, redirects, docs, e2e tests
- **Codegen manifests** - e.g. `blueprints/*.yaml`, OpenAPI, protobuf
- **Docs** - `docs/`, README, feature catalogs
- **Tests** - distinguish "only used in its own test file" from real consumers

Do not delete **compat** items until the user confirms no needed sunset period.

## 4. Delete in batches

One logical cluster per change set (one PR if the user commits):

| Batch example | Scope |
|---------------|-------|
| `diagramState/*` orphans | One module family |
| `App.tsx` redirects | All related routes together |
| TraceLens URL compat | Hook + page + tests together |

Per batch:

1. Delete or inline code (minimal diff - see [CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §4).
2. Remove stale manifest and doc entries in the **same** batch.
3. Run [agent-pre-commit](../agent-pre-commit/SKILL.md) until green.
4. Update backlog row status.

## 5. Compat shims (redirects, legacy URL params)

Before removing:

1. Ask: live bookmarks, published docs, or analytics still hitting this path?
2. Record sunset date in backlog if removing.
3. Remove redirect routes, legacy param fallbacks, and tests together.

If uncertain, leave row `blocked` and note why in handover.

## 6. Handover

Write `~/.agents/handover/<project>/handover_prune.md` using [templates/handover.md](../../templates/handover.md). Phase = `maintenance`.

Include:

```markdown
## Removed
- <symbol/file> - <one-line reason>

## Deferred (blocked)
- <item> - <why, e.g. compat sunset pending>

## Backlog
- Updated dead-code-backlog.md: N ready → done
```

## Relationship to other roles

| Role | Responsibility |
|------|----------------|
| [agent-arch-drift](../agent-arch-drift/SKILL.md) | Find violations; append candidates to backlog |
| **agent-prune** | Verify and delete ready rows |
| [agent-pre-commit](../agent-pre-commit/SKILL.md) | Prove green after each batch |

When `agent-arch-drift` finds dead code, add a row to `dead-code-backlog.md` instead of deleting inline during a feature PR.
