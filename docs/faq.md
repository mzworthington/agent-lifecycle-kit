# Common questions

Need a job, not an objection? [Jobs for today](/docs/jobs). First install: [Getting started](/docs/start).

## What is Waykit?

Waykit is the software lifecycle for coding agents: grill, spec, TDD, quality, audit, release, plus learning loops so the next session is better than the last. Eval-driven development is one of those loops, when the change is a prompt or a tool contract. Feature path: [lifecycle](/docs/lifecycle).

## How do I install Waykit?

On macOS or Linux, run the installer, then bootstrap the app repo:

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/waykit/main/install.sh | sh
wk init . --mcp default --hook
```

You need git and Node 22+. If `wk` is not found, add `~/.local/bin` to `PATH`. Full steps: [Getting started](/docs/start).

## Do I need an API key?

No. Install, `wk check`, and `wk eval` with `--style local` (the default) run offline. Cursor and Copilot load skills and `AGENTS.md`; they are not the eval runner. A provider key is only for `--style http` over an OpenAI-compatible API. `--style cli` shells out to `cursor-agent`, `claude`, or `agy`. Details: [EDD guide](/docs/edd).

## How do I check README, license, and GitHub templates on my repos?

Use `wk doctor`. It asks GitHub for **sources you admin** and skips forks:

```bash
wk doctor --owned --scan ~/Documents/dev
wk doctor . --write
```

Report-only by default. `--write` fills missing files and never overwrites README or LICENSE. Handshake and hooks stay on `wk init`. Guide: [Repo doctor](/docs/doctor).

## Why not dump everything into AGENTS.md?

Agents pay for every byte in the bootstrap. Always-on files (`AGENTS.md`, the project handshake, and thin IDE rules) stay under about 8KB, roughly 2k tokens. Philosophy and SOPs load on demand via kit-knowledge. Compose **one MCP profile** per session (`wk mcp default --install`, or the id on the skill's `mcp:` frontmatter) so unused tool schemas stay out of the prompt. `wk measure-context` prints the breakdown; `wk check` fails if the budget is exceeded. Operator write-up: [What Waykit gives you](/docs/kit).

## How does the agent find the right SOP?

The kit is a live graph: skills, SOPs, MCP servers, evals, and docs. You edit those files; `wk ontology check` fails dangling `depends-on` and `mcp:` links. Agents stay on the thin handshake, then kit-knowledge walks neighbors (`get_entity`, `get_related`) instead of dumping the tree. Browse it: [Waykit map](/docs/map). How to add a node: [Author the Waykit map](/ontology).

## Where does EDD fit?

Inside TDD, when the change is a prompt or a tool contract. You write a failing eval for the tool and arguments you expect, implement until it passes, then gate the merge with `wk eval ci --threshold-routing 95`. A production miss becomes a JSONL case in the same suite. How mocks, styles, and CI work: [EDD guide](/docs/edd).

## Is the Waykit map my product architecture?

No. The [Waykit map](/docs/map) is **this kit**: skills, SOPs, MCP servers, evals, and docs. It does not draw your system. Add a skill or SOP in the kit checkout, then `wk ontology check` and `wk ontology generate`. Step-by-step: [Author the Waykit map](/ontology).
