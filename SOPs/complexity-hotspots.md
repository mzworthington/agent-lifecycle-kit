---
title: Complexity hotspots - detect, backlog, reduce
kind: sop
triggers:
  - complexity
  - hotspot
  - cognitive complexity
  - cyclomatic
  - god class
  - long function
  - simplify
  - refactor complexity
tools:
  - read
  - write
  - grep
  - shell
---
# Standard Operating Procedure: Complexity Hotspots

Reduce structural complexity in **small, test-backed batches**. Detection belongs to [agent-arch-drift](../skills/agent-arch-drift/SKILL.md); execution belongs to [agent-prune](../skills/agent-prune/SKILL.md) (complexity track). Align with [CODING_PHILOSOPHY.md](../CODING_PHILOSOPHY.md) §4 (minimal change): simplify before adding layers.

## 1. What counts as a hotspot

A **complexity hotspot** is code that is hard to change safely because of shape, not because it is unused (that is dead code).

| Signal | Typical threshold | Notes |
|--------|-------------------|-------|
| **Cognitive / cyclomatic complexity** | Above project linter default or > 15 per function | Prefer repo-configured rules (ESLint, Sonar, Checkstyle) |
| **Function length** | > 40–60 lines without clear structure | Domain logic may be longer if cohesive |
| **File length** | > 300–400 lines mixing concerns | Split by vertical slice, not arbitrary chunking |
| **Nesting depth** | > 3–4 levels | Extract guard clauses or early returns |
| **Parameter count** | > 3 positional args | Use a parameter object at the boundary |
| **God module** | Many unrelated exports in one file | Split slice or extract shared domain |
| **Duplicate logic** | Same branch/business rule in 2+ places | Consolidate or extract shared domain function |
| **Shotgun coupling** | One story forces edits across unrelated slices | Re-home behavior into the owning slice |

When metrics and judgment disagree, **trust change friction**: if reviewers consistently miss edge cases in a module, treat it as a hotspot even if metrics are borderline.

## 2. Backlog location

Per project, maintain:

`~/.agents/handover/<project>/complexity-backlog.md`

Do not commit backlog files to the app repo. Template:

```markdown
# Complexity backlog

| ID | Location | Signal | Class | Status | Notes |
|----|----------|--------|-------|--------|-------|
| C-001 | src/features/foo/Handler.ts | cognitive 22 | extract | ready | split validation block |
```

**Status values:** `candidate` → `ready` → `done` | `blocked` | `wontfix`

**Class values:** `extract` | `inline` | `split-slice` | `consolidate` | `defer`

## 3. Detection (audit / drift)

During [agent-arch-drift](../skills/agent-arch-drift/SKILL.md) reviews or when the user asks for a complexity pass:

1. Run project metrics when documented (see §5).
2. Walk changed files and top churn modules from recent PRs.
3. For each hotspot, open a backlog row with **signal**, **class**, and a one-line **remediation** hypothesis.
4. Do **not** refactor inline during a feature PR unless the user scoped simplification in the same change.

Route execution to `agent-prune` when rows are `ready`.

## 4. Reduction (prune - complexity track)

[agent-prune](../skills/agent-prune/SKILL.md) complexity track:

1. Load `complexity-backlog.md`; process only `ready` rows (confirm with user if backlog was auto-generated).
2. One **batch** = one hotspot cluster (one function family or one slice folder).
3. Prefer **behavior-preserving** refactors: extract function, guard clauses, move code into owning slice, consolidate duplicates.
4. Run tests for touched slices; run [agent-pre-commit](../skills/agent-pre-commit/SKILL.md) before marking `done`.
5. If simplification needs a lasting boundary change, route to [agent-adr](../skills/agent-adr/SKILL.md) and set row `blocked`.

**Reject during prune:**

- Rewrites that change behavior without catalog/test alignment.
- New abstractions with a single call site (inline instead).
- Splitting files without moving toward vertical-slice cohesion.

## 5. Tooling (use what the repo already has)

| Stack | Examples |
|-------|----------|
| TypeScript | `eslint` complexity rules, `typescript-eslint`, optional `ts-complexity` / Sonar |
| Java | Checkstyle, PMD, Sonar cognitive complexity |
| C# | Roslyn analyzers, Sonar, NDepend if present |
| General | `rg` for duplicate strings/branches; `git log --stat` for churn |

Do not add new analysis tools without user alignment. Document the command used in the handover.

## 6. Orchestration routes

| Request | Route |
|---------|-------|
| "Simplify X" / complexity cleanup | `agent-arch-drift` (scan) → backlog → `agent-prune` → `agent-pre-commit` |
| Post-audit remediation | Rows already in backlog → `agent-prune` |
| Feature work touching a known hotspot | Note backlog ID in handover; optional small extract-only fix in scope |

Not part of the default feature lifecycle unless the user requests it or audit rows are `ready`.

## 7. Handover

Complexity work uses phase `maintenance` in `handover_prune.md` (same artifact as dead-code prune). Include:

- Backlog IDs completed
- Metrics before/after when available
- Tests run
- Rows left `blocked` or `defer` with reason
