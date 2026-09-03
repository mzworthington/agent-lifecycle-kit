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
  - feat vs docs
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
- **scope** (optional): short area (`cli`, `canvas`, `skills`, `sops`, `mcp`, …)
- **description**: imperative, lowercase start, no trailing period, ≤ ~72 chars for the subject line
- Breaking change: `!` after type/scope (`feat(api)!: …`) and/or a `BREAKING CHANGE:` footer in the body

Examples:

| Good | Bad |
|------|-----|
| `feat(skills): add agent-debug skill` | `docs: add agent-debug skill` |
| `feat(sops): route model class before tdd` | `docs: update model-routing SOP` |
| `fix(cli): retry transient R2 errors` | `Fixed the R2 issue` |
| `docs: prefer Mermaid over ASCII diagrams` | `Prefer Mermaid diagrams over ASCII art` |
| `chore: update .gitignore for env files` | `Update gitignore` |

## Type (not file extension)

Hosts often default Markdown to `docs`. **Do not.** Type follows **behavior change**:

| Paths / change | Type |
|----------------|------|
| `skills/`, `SOPs/`, `models/`, `AGENTS.md` routing, MCP profiles | `feat` / `fix` (scope `skills`, `sops`, `mcp`, …) |
| App or CLI product behavior | `feat` / `fix` |
| Human-only narrative (`docs/`, README, marketing) with no agent or product behavior change | `docs` |
| Eval or test-only | `test` (keep `feat` when the same change ships a new capability) |
| Tooling, lockfiles, ignore rules | `chore` / `ci` / `build` |

A `.md` skill or SOP is still agent behavior. `docs` is for humans reading a guide, not for changing what the agent does.

## Rules

1. **Every git commit message** uses the format above (subject line).
2. **Every pull request title** uses the same format. Treat the PR title as the squash-merge commit message.
3. When updating a PR, keep the title conventional if the primary change type is unchanged; retitle if the PR’s purpose shifted (e.g. `feat` → `fix`).
4. Prefer one clear type from the table above. Never pick `docs` only because the path ends in `.md`.
5. Do not use merge-commit style subjects (`Merge pull request #…`) as PR titles.

## Checklist before open / update PR

- [ ] PR title matches `<type>(scope): description`
- [ ] Title summarizes the whole PR (what lands on main after squash), not a single intermediate commit
- [ ] Body can stay free-form (summary, test plan); title stays conventional
- [ ] Skill / SOP / model-catalog changes use `feat`/`fix`, not `docs`
