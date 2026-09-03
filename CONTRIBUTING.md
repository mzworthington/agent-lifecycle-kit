# Contributing

Thanks for helping improve Waykit. This repo is the `.agents` kit: skills, SOPs, learning loops (including the EDD harness), and the `wk` CLI (`kit` is an alias).

## Prerequisites

* Node.js **22+**
* [pnpm](https://pnpm.io/) 9+
* `git`

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm kit check
```

If this branch has lint wired: `pnpm lint`.

## Workflow

1. Branch from `main`.
2. Prefer the smallest change that matches [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) (and its **Applicability & opt-out** section).
3. For prompt / MCP schema / agent-routing changes, follow **EDD (alpha)**: add or extend evals first, then implement ([docs/edd.md](./docs/edd.md)).
4. Keep PRs focused. One concern per PR when practical.

## Commit and PR titles

Use [Conventional Commits](./SOPs/conventional-commits.md) for **every commit and every PR title**. This repo squash-merges; the PR title becomes the commit on `main` and feeds changelog/release automation.

Examples: `feat(skills): …`, `fix(cli): …`, `docs: …`, `ci: …`.

Husky `.husky/commit-msg` (and `wk commit-msg`) reject a non-conventional **commit subject**. CI on pull requests also checks the **PR title**. `wk doctor` reports missing community files on GitHub sources you admin. `wk align` reports consumer handshake drift (host pointers, kit MCP, commit-msg).

## Checks we expect green

| Check | Command / location |
|-------|--------------------|
| Typecheck | `pnpm typecheck` |
| Unit tests | `pnpm test` / `pnpm test:ci` |
| Kit gate | `pnpm kit check` (audit, layout, EDD routing thresholds, context budget) |
| Pre-commit | Husky runs audit/validate/verify (+ typecheck; lint when present) |
| Commit message | Husky `commit-msg` → `wk commit-msg`; PR title checked in Verify |

## Docs and ADRs

* Narrative docs: prefer clear, human voice ([agent-docs](./skills/agent-docs/SKILL.md) / [agent-copy](./skills/agent-copy/SKILL.md) when rewriting README/site copy).
* Diagrams: **Mermaid only** (no ASCII architecture art).
* Hard-to-reverse kit decisions: sparse ADRs under [docs/ADRs/](./docs/ADRs/README.md).

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting. Do not commit secrets, tokens, or real customer data into skills, evals, or fixtures.

## License

Contributions are accepted under the same [Unlicense](./LICENSE) terms as the rest of the kit.
