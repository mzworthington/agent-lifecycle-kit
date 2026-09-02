# Common questions

## What do I use this for today?

Use the [job picker](/docs/jobs). Common paths: write a failing routing eval when the agent guesses, gate prompt/schema PRs with `kit eval ci --suite evals/edd/demo.yaml --threshold-routing 95`, shrink always-on rules with `kit measure-context`, or follow the [feature lifecycle](/docs/lifecycle) when the work is bigger than a prompt tweak. New here? [Start in 10 minutes](/docs/start).

## What is Eval-Driven Development?

EDD is TDD for agents that call tools. You write a failing eval for the tool and arguments you expect, implement the schema and prompt until it passes, then tighten until CI holds.

## How is EDD different from eyeballing prompts?

Each case starts from a fresh context. Tools are mocked, so you measure routing and extraction rather than network luck. Asserts cover JSON schema match plus an optional LLM-as-a-judge. CI can block the merge when routing accuracy drops.

## How do I install kit?

On macOS or Linux, run the installer, then bootstrap the app repo:

Preferred (checksum):

```bash
BASE=https://raw.githubusercontent.com/mzworthington/agent-lifecycle-kit/main
curl -fsSL "$BASE/install.sh" -o install.sh
curl -fsSL "$BASE/install.sh.sha256" -o install.sh.sha256
echo "$(cat install.sh.sha256)  install.sh" | sha256sum -c -
sh install.sh
```

Then `kit init . --mcp default --hook`. You need git, Node 22+, and `sha256sum`. Convenience without a checksum: `curl -fsSL …/install.sh | sh`. If `kit` is not found, add `~/.local/bin` to `PATH`. Full steps: [Getting started](/docs/start).

## How do I run EDD in CI?

Run `kit eval ci --threshold-routing 95 --out out/reports`. PR CI and `kit check` use `--style local` (offline, no API key). `--style http` is the nightly live job when `KIT_EVAL_API_KEY` is set. `--style cli --cli cursor-agent|claude|agy` is for local iteration with a headless assistant.

## Do I need an OpenAI key if I use Cursor or GitHub Copilot?

No. **Cursor is the reference host** for progressive skills and MCP compose. Copilot, Claude Code, Gemini CLI, and Windsurf get the same canonical `AGENTS.md` via thin stubs (`kit export-rules` / `kit init`), not equal skill or MCP discovery. `kit eval` defaults to `--style local` and does not call Cursor Chat or Copilot Chat. `--style cli` shells out to `cursor-agent`, `claude`, or `agy`. A provider key is only for `--style http` over an OpenAI-compatible API. Full flow: [EDD guide](/docs/edd).

## What happens after a production miss?

Turn the miss into a JSONL case and add it to the suite. Shadow evals can sample live traffic so the next failure is a test, not a surprise.

## How does kit keep agent context small?

Always-on files (`AGENTS.md`, the project handshake, and thin IDE rules) stay under about 8KB, roughly 2k tokens. Philosophy and SOPs load on demand via kit-knowledge. Run `kit measure-context` for the breakdown; `kit check` fails if that budget is exceeded. Compose one MCP profile per session so unused tool schemas stay out of the prompt. Full write-up: [operator guide](/docs/kit).

## How do I visualize our team's setup on the kit map?

The [kit map](/docs/map) shows **this kit**: skills, SOPs, MCP servers, evals, and docs. It does not draw your product architecture. Add a skill or SOP in the kit checkout, then `kit ontology check` and `kit ontology generate`. Step-by-step: [Author the kit map](/ontology).
