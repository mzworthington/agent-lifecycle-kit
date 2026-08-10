---
title: Conventional commits and PR titles
kind: sop
triggers:
  - commit
  - pull request
  - PR title
  - squash merge
  - conventional commits
  - changelog
tools:
  - shell
---
# Standard Operating Procedure: Conventional Commits & PR Titles

Repos squash-and-merge. The **PR title becomes the commit on the default branch**. A conventional commit on a branch tip is not enough if the PR title drifts into a free-form sentence.

Align with [CODING_PHILOSOPHY.md](../CODING_PHILOSOPHY.md) §8 (Interaction Mandate).

## Format

```text
<type>(optional-scope): <description>
```

- **type** (required): one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **scope** (optional): short area (`cli`, `canvas`, `skills`, `mcp`, …)
- **description**: imperative, lowercase start, no trailing period, ≤ ~72 chars for the subject line
- Breaking change: `!` after type/scope (`feat(api)!: …`) and/or a `BREAKING CHANGE:` footer in the body

Examples:

| Good | Bad |
|------|-----|
| `feat: add agent-debug skill` | `Add agent-debug skill` |
| `fix(cli): retry transient R2 errors` | `Fixed the R2 issue` |
| `docs: prefer Mermaid over ASCII diagrams` | `Prefer Mermaid diagrams over ASCII art` |
| `chore: update .gitignore for env files` | `Update gitignore` |

## Rules

1. **Every git commit message** uses the format above (subject line).
2. **Every pull request title** uses the same format. Treat the PR title as the squash-merge commit message.
3. When updating a PR, keep the title conventional if the primary change type is unchanged; retitle if the PR’s purpose shifted (e.g. `feat` → `fix`).
4. Prefer one clear type that matches the user-visible outcome. Kit/docs/skills-only changes → `docs` or `chore`. Product behavior → `feat` / `fix`.
5. Do not use merge-commit style subjects (`Merge pull request #…`) as PR titles.

## Checklist before open / update PR

Full PR gate (title + React template candidate + checks): [open-pull-request.md](./open-pull-request.md).

- [ ] PR title matches `<type>(scope): description`
- [ ] Title summarizes the whole PR (what lands on main after squash), not a single intermediate commit
- [ ] Body can stay free-form (summary, test plan); title stays conventional
- [ ] Ran the React template-candidate scan in [open-pull-request.md](./open-pull-request.md) §2 and notified the user if it matched
