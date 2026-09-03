# Getting started

Four steps to Waykit on a repo. macOS and Linux; needs git and Node 22+. No API key.

1. **Install Waykit (~2 min)** — Links `~/.agents` and puts `wk` on your PATH via `~/.local/bin` (`kit` remains an alias).
2. **Bootstrap this checkout (~2 min)** — `wk init . --mcp default --hook` writes the thin handshake, IDE pointers, and a default MCP profile. Already in this repo? `./install.sh` is enough.
3. **Open the lifecycle (~3 min)** — Feature work routes grill → spec → TDD + XFN → audit → release. Read the [feature lifecycle](/docs/lifecycle).
4. **Optional: prove a tool call (~3 min, EDD alpha)** — `wk eval run --suite evals/edd/demo.yaml --model scripted`, then `wk eval ci --suite evals/edd/demo.yaml --threshold-routing 95 --out out/reports`.

## Install Waykit

If `wk` is missing after install, add `~/.local/bin` to `PATH`.

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/waykit/main/install.sh | sh
wk init . --mcp default --hook
```

## Run an eval locally (optional)

```bash
wk eval run --suite evals/edd/demo.yaml --model scripted
wk eval ci --suite evals/edd/demo.yaml --threshold-routing 95 --out out/reports
wk eval report --format md --out out/reports
```

The scripted driver works offline. A provider key is only for optional live-model evals.

## Shell completions

zsh (add to `~/.zshrc`, then `exec zsh`):

```zsh
source <(wk completion zsh)
```

bash (add to `~/.bashrc`):

```bash
eval "$(wk completion bash)"
```

Tab after `wk ` lists commands; `wk eval `, `wk ontology `, and `wk mcp ` get the next word. `wk completion zsh` also works as a file: write it to `~/.zfunc/_wk` and add that directory to `fpath` before `compinit`.

## Next

- [Jobs for today](/docs/jobs) if you already know the failure in front of you
- [Feature lifecycle](/docs/lifecycle) for grill → spec → TDD → ship
- [EDD guide (alpha)](/docs/edd) for suites, CI, and production misses
- [Hosts](/docs/hosts) for Cursor, Claude Code, Copilot, and Antigravity files
- [What Waykit gives you](/docs/kit) for context budget, the live kit graph, and MCP profiles
- [Repo doctor](/docs/doctor) for README, license, and GitHub templates on repos you own
- [Waykit map](/docs/map) is that graph in the browser; [author it](/ontology) after you change skills or SOPs
- [Common questions](/docs/faq)
