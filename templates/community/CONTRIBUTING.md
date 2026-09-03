# Contributing

## Setup

See the project README for toolchain and local commands.

## Commits and pull requests

Use conventional commits for every commit and every PR title (`feat:`, `fix:`, `docs:`, …). This repo squash-merges; the PR title becomes the commit on `main`.

Fill in the pull request template. On a checkout you admin, `wk init --hook` installs local `pre-commit` and `commit-msg` hooks. `wk doctor` reports missing community files (README, license, contributing, GitHub templates) and can fill gaps with `--write` without overwriting existing files.

## License

Contributions use the same terms as [LICENSE](./LICENSE).
