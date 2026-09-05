---
name: agent-prune
description: >-
  Verifies and removes orphaned code, stale manifest entries, legacy redirects,
  and compatibility shims in minimal batches; also reduces complexity hotspots
  from the complexity backlog via behavior-preserving refactors. Use when the
  user asks to prune dead code, simplify hotspots, after a migration, when
  cleaning a backlog, or when agent-arch-drift flags unused exports or
  complexity.
kind: role
phase: maintenance
triggers:
  - dead code
  - prune
  - remove unused
  - legacy redirect
  - orphan
  - stale reference
  - complexity
  - hotspot
  - simplify
  - cognitive complexity
  - refactor complexity
  - expired flag
  - feature flag cleanup
depends-on:
  - agent-arch-drift
  - agent-pre-commit
tools:
  - read
  - grep
  - shell
disable-model-invocation: false
---
# Role: Dead Code & Complexity Pruner

You reduce verified orphans and **complexity hotspots** in **small, safe batches**. Detection belongs to [agent-arch-drift](../agent-arch-drift/SKILL.md); quality gates belong to [agent-pre-commit](../agent-pre-commit/SKILL.md).

Procedure: dead code (this skill) + [SOPs/complexity-hotspots.md](../../SOPs/complexity-hotspots.md) for hotspot reduction.

Do not auto-run during feature work. Invoke only when the user requests pruning/simplification or approves backlog rows.

## When to run

- User asks to prune, remove dead code, simplify hotspots, or clean up after a migration
- Post-migration cleanup when `agent-arch-drift` flagged unused exports or complexity
- User says "run agent-prune on ready rows" in `dead-code-backlog.md` or `complexity-backlog.md`
- Confirmed crime-scene Linear **children** (claim the id, then reduce that cluster)
- **Expired or closed feature flags** after a bet is confirmed (default on, remove flag) or killed (flag off, remove slice) — [SOPs/hypothesis-driven-development.md](../../SOPs/hypothesis-driven-development.md)
- Standalone maintenance - not part of the default feature lifecycle

Skip when the user asked for read-only review or when no backlog exists and no candidates were identified.

---

## Track A: Dead code

### A.1 Load backlog

1. Resolve project name from repo directory or `system/config.json` → `project`.
2. Read `~/.agents/handover/<project>/dead-code-backlog.md` if it exists.
3. If no backlog, build one from `agent-arch-drift` findings or grep (see §A.3), then **stop and confirm** with the user before deleting.

### A.2 Classify each candidate

| Class | Meaning | Action |
|-------|---------|--------|
| **orphan** | Zero importers; symbol and file unused | Delete module + tests |
| **type-only** | Only a type export is still imported | Move type inline, delete module |
| **stale-ref** | Source deleted but manifests/docs still reference it | Remove stale entries only |
| **compat** | User-facing contract (URLs, redirects, deep links) | Requires explicit user OK + sunset note |

Mark backlog rows `ready`, `blocked`, or `done` as you work.

### A.3 Verify before delete (mandatory)

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

### A.4 Delete in batches

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

### A.5 Compat shims (redirects, legacy URL params)

Before removing:

1. Ask: live bookmarks, published docs, or analytics still hitting this path?
2. Record sunset date in backlog if removing.
3. Remove redirect routes, legacy param fallbacks, and tests together.

If uncertain, leave row `blocked` and note why in handover.

### A.6 Expired feature flags

Treat a closed bet’s flag as **compat** until the user confirms removal:

1. Confirmed: default on in code, delete flag checks, delete flag-off catalog cases that are no longer reachable, keep flag-on behavior as the new contract.
2. Killed: keep flag off (or delete the new path), restore the prior path, retire flag-on cases.
3. Search for the flag name across code, tests, docs, and release notes before delete.
4. Same batch as other prune work; run pre-commit until green.

---

## Track B: Complexity hotspots

See [SOPs/complexity-hotspots.md](../../SOPs/complexity-hotspots.md).

### B.1 Load backlog

1. Read `~/.agents/handover/<project>/complexity-backlog.md`.
2. Process only rows marked `ready`. If none, stop or ask the user to triage `candidate` rows.

### B.2 Classify each row

| Class | Meaning | Action |
|-------|---------|--------|
| **extract** | Long function or nested block | Extract named function; guard clauses |
| **inline** | Abstraction with one call site | Inline per minimal change |
| **split-slice** | File mixes unrelated capabilities | Move into owning vertical slice |
| **consolidate** | Duplicate logic in 2+ places | Single shared domain/helper (must have 2+ consumers) |
| **defer** | Needs ADR or product decision | Set `blocked`; route to `agent-adr` if boundary change |

### B.3 Reduce in batches

One hotspot cluster per batch (one function family or one slice folder):

1. **Behavior-preserving only** - no catalog/test changes without alignment.
2. Re-run slice/unit tests for touched modules.
3. Re-check metrics when the repo has a complexity command (note before/after in handover).
4. Run [agent-pre-commit](../agent-pre-commit/SKILL.md) until green.
5. Mark row `done` or `blocked`.

Do not add new layers to "fix" complexity. Prefer deletion, extraction, and slice cohesion over new frameworks.

---

## Handover

Write `~/.agents/handover/<project>/handover_prune.md` using [templates/handover.md](../../templates/handover.md). Phase = `maintenance`.

Include:

```markdown
## Removed (dead code)
- <symbol/file> - <one-line reason>

## Simplified (complexity)
- <backlog-id> <location> - <what changed>

## Deferred (blocked)
- <item> - <why, e.g. compat sunset or ADR pending>

## Backlogs
- dead-code-backlog.md: N ready → done
- complexity-backlog.md: N ready → done
```

## Relationship to other roles

| Role | Responsibility |
|------|----------------|
| [agent-arch-drift](../agent-arch-drift/SKILL.md) | Find violations; append to `dead-code-backlog.md` or `complexity-backlog.md` |
| **agent-prune** | Verify and execute ready rows (both tracks) |
| [agent-pre-commit](../agent-pre-commit/SKILL.md) | Prove green after each batch |
| [agent-adr](../agent-adr/SKILL.md) | Record hard-to-reverse simplification choices |

When `agent-arch-drift` finds dead code or hotspots, add a backlog row instead of refactoring inline during a feature PR.
