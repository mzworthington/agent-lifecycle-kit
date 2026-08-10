---
name: agent-pre-commit
description: >-
  Discovers and runs git pre-commit hook checks before handover or commit,
  then fixes failures until green. Enforces Conventional Commits for commit
  subjects and PR titles, and the open-PR SOP (including React template
  candidate notify). Use when finishing implementation, before declaring work
  complete, when opening or updating a PR, when the user asks to fix
  lint/build/hook errors, or when a repo has .husky/pre-commit,
  .git/hooks/pre-commit, or .pre-commit-config.yaml.
kind: role
phase: quality
triggers:
  - pre-commit
  - pre commit hook
  - husky
  - lint-staged
  - hook checks
  - fix lint
  - fix build
  - quality gate
  - conventional commits
  - PR title
  - commit message
  - open PR
  - react template
  - template candidate
depends-on: []
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Role: Pre-commit Quality Gate

Run the repo's pre-commit checks after code changes and **fix all failures** before handover or telling the user work is done.

## When to run

- End of **impl** (`agent-adapter`) and **refactor** (`agent-tdd`) phases
- Before **release** in `agent-orchestrator`
- Any time the user reports hook, lint, format, typecheck, or build failures
- Proactively when you have modified tracked files in a repo with a pre-commit hook

Skip when the user asked for a read-only review or when no hook exists and no project check scripts are documented.

## 1. Discover hooks

Check, in order:

| Path | Type |
|------|------|
| `.pre-commit-config.yaml` | [pre-commit](https://pre-commit.com/) framework |
| `.husky/pre-commit` | Husky shell hook |
| `.git/hooks/pre-commit` | Plain git hook |

Also read `package.json` / `Makefile` / CI workflow for scripts the hook delegates to (`lint`, `format:check`, `typecheck`, `test`, etc.).

## 2. Run checks

### pre-commit framework

```bash
pre-commit run --all-files
```

Re-run after fixes until exit code 0.

### Husky or custom shell hook

Hooks often gate on **staged** paths only. Stage modified tracked files, run the hook, then unstage (does not commit):

```bash
git add -u
.husky/pre-commit    # or: .git/hooks/pre-commit
git restore --staged .
```

If the hook still skips checks, read the script and run the underlying commands directly (see §3).

### No hook

Run the project's documented quality scripts from README, `AGENTS.md`, or CI (e.g. `pnpm lint`, `pnpm typecheck`, `pnpm test`).

## 3. Infer checks from the hook script

When the hook is path-conditional, map changed files to commands:

```bash
git diff --name-only HEAD
git diff --cached --name-only
```

Common patterns:

| Changed paths | Typical commands |
|---------------|------------------|
| `app/` TypeScript | `cd app && pnpm lint && pnpm typecheck && pnpm test` (or `vitest run --changed`) |
| `docs/`, `*.md` | `cd app && pnpm format:check` |
| `app/packages/core/` | schema/codegen `--check` if hook references it |
| `*.go` in a Go module | `make check test` in that module |

Prefer the **exact commands** named in the hook over guessing.

## 4. Fix loop

1. Run checks (§2–3).
2. On failure: read stderr, fix the reported files, do not `--no-verify` or skip hooks unless the user explicitly requests it.
3. Re-run the **same** check command until exit code 0.
4. If auto-fixers run (`prettier --write`, `lint-staged`), re-run checks to confirm clean.

Report to the user: which hook/commands ran and what was fixed.

## 5. Handover note

When completing a lifecycle phase, include in the handover:

```markdown
## Pre-commit
- Hook: `.husky/pre-commit` (or none)
- Commands: `pnpm lint`, `pnpm typecheck`, …
- Status: PASS
```

Do not mark **COMPLETE** while hook checks are failing.

## 6. Commit messages, PR titles, and PR open gate

When you (or the user) create commits or open/update a pull request:

1. Follow [SOPs/conventional-commits.md](../../SOPs/conventional-commits.md) for commit subjects and **PR titles**.
2. Follow [SOPs/open-pull-request.md](../../SOPs/open-pull-request.md) before publishing the PR:
   - Conventional title (squash-and-merge uses it on the default branch)
   - **React template candidate** scan → if the diff adds reusable frontend building blocks, **notify the user in the conversation** (offer follow-up against `react-cloudflare-template`); do not extract silently
3. Before handover that includes a PR link, verify the PR title is conventional and the template scan was done (or explicitly N/A).
