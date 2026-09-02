# Getting started

Four steps to a failing eval you can paste into a PR. macOS and Linux; needs git and Node 22+. No API key.

1. **Install kit (~2 min)** — Links `~/.agents` and puts `kit` on your PATH via `~/.local/bin`.
2. **Bootstrap this checkout (~2 min)** — `kit init . --mcp default --hook` writes the thin handshake, IDE pointers, and a default MCP profile. Already in this repo? `./install.sh` is enough.
3. **Run the demo suite (~3 min)** — `kit eval run --suite evals/edd/demo.yaml --model scripted`: six teaching cases, offline.
4. **Hold the 95% bar (~3 min)** — `kit eval ci --suite evals/edd/demo.yaml --threshold-routing 95 --out out/reports` then `kit eval report --format md --out out/reports`.

## Install kit

If `kit` is missing after install, add `~/.local/bin` to `PATH`.

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/agent-lifecycle-kit/main/install.sh | sh
kit init . --mcp default --hook
```

## Run it locally

```bash
kit eval run --suite evals/edd/demo.yaml --model scripted
kit eval ci --suite evals/edd/demo.yaml --threshold-routing 95 --out out/reports
kit eval report --format md --out out/reports
```

The scripted driver works offline. A provider key is only for optional live-model evals.

## Next

- [Jobs for today](/docs/jobs) if you already know the failure in front of you
- [EDD guide](/docs/edd) for suites, CI, and production misses
- [What kit gives you](/docs/kit) for context budget and MCP profiles
- [Common questions](/docs/faq)
