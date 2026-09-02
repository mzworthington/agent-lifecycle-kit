# Getting started

Four steps to Waykit on a repo. macOS and Linux; needs git and Node 22+. No API key.

1. **Install Waykit (~2 min)** — Links `~/.agents` and puts `wk` on your PATH via `~/.local/bin` (`kit` remains an alias).
2. **Bootstrap this checkout (~2 min)** — `wk init . --mcp default --hook` writes the thin handshake, IDE pointers, and a default MCP profile. Already in this repo? `./install.sh` is enough.
3. **Open the lifecycle (~3 min)** — Feature work routes grill → spec → TDD + XFN → audit → release. Read the [feature lifecycle](/docs/lifecycle).
4. **Optional: prove a tool call (~3 min)** — `wk eval run --suite evals/edd/demo.yaml --model scripted`, then `wk eval ci --suite evals/edd/demo.yaml --threshold-routing 95 --out out/reports`.

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

## Next

- [Jobs for today](/docs/jobs) if you already know the failure in front of you
- [Feature lifecycle](/docs/lifecycle) for grill → spec → TDD → ship
- [EDD guide](/docs/edd) for suites, CI, and production misses
- [What Waykit gives you](/docs/kit) for context budget, the live kit graph, and MCP profiles
- [Waykit map](/docs/map) is that graph in the browser; [author it](/ontology) after you change skills or SOPs
- [Common questions](/docs/faq)
