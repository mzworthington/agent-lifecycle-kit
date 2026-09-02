# What do I use this for today?

Pick the job in front of you. Kit is a product you run, not a docs pile you browse.

Each heading is `id | title`. The homepage picker and this page share the same source.

## wrong-tool | Wrong tool or made-up args

> The agent guessed architecture, skipped the MCP tool, or invented parameters.

Capture the miss as a JSONL case, mock the tool, and assert routing until the agent stops guessing.

1. **Write the case** for the prompt that failed (expected tool + args).
2. **Run** `kit eval run --suite evals/edd/demo.yaml --model scripted`
3. **Read the report**, tighten the schema or prompt, re-run until green.

```
kit eval run --suite evals/edd/demo.yaml --model scripted
```

- [See before / after](/#proof)
- [Walk the failing-eval demo](/#demo)
- [Demo suite](/evals/edd/demo.yaml)

## ci-gate | Gate a prompt or schema change

> You changed system instructions or a tool contract and need a merge bar.

Treat the prompt and MCP schema like code under test. Fail the PR when routing accuracy drops.

1. **Keep the suite next to the change** (start from `evals/edd/demo.yaml`).
2. **Run** `kit eval ci --suite evals/edd/demo.yaml --threshold-routing 95 --out out/reports`
3. **Attach the markdown report** with `kit eval report --format md --out out/reports`.

```
kit eval ci --suite evals/edd/demo.yaml --threshold-routing 95 --out out/reports
```

- [Before / after](/#proof)
- [Example report](/evals/edd/examples/eval-report)
- [10-minute path](/docs/start)

## context | Always-on context is too fat

> Rules dumps are eating the window. You want a budget you can fail CI on.

Thin bootstrap stays under about 8KB. Philosophy and SOPs load on demand; CI fails if the budget blows.

1. **Measure** with `kit measure-context`.
2. **Compose one MCP profile** so unused tool schemas stay out of the prompt.
3. **Hold the bar** with `kit check` (includes the context budget).

```
kit measure-context && kit check
```

- [Context budget SOP](/SOPs/context-budget)
- [MCP profiles](/SOPs/mcp-library)
- [Operator guide](/docs/kit)

## feature | Starting a product feature

> Need the lifecycle path: grill → spec → TDD short loop → XFN → ship.

EDD proves tool calls. Feature work still routes through specialist roles so the catalog and XFN rows stay honest.

1. **Stress-test the idea** (grilling) until the decision frontier is clear.
2. **Spec** acceptance criteria, then TDD short loop (gear 1 + gear 2). Use EDD when the change is a prompt or tool schema.
3. **Green XFN apply rows**, audit, then release with a conventional PR title.

```
Open the orchestrator skill and follow the phase table in AGENTS.md
```

- [Feature lifecycle](/docs/lifecycle)
- [Orchestrator skill](https://github.com/mzworthington/agent-lifecycle-kit/blob/main/skills/agent-orchestrator/SKILL.md)
- [How EDD fits](/docs/edd)

## first-hour | I have never installed kit

> Fresh machine. Get `kit` on PATH, bootstrap the repo, run one suite.

Get kit on PATH, bootstrap the repo, run one offline suite, then hold the 95% bar locally.

1. **Install** with the verified checksum (git, Node 22+, `sha256sum`).
2. **Init** `kit init . --mcp default --hook`.
3. **Prove routing** with `kit eval run --suite evals/edd/demo.yaml --model scripted`, then hold the 95% bar.

```
BASE=https://raw.githubusercontent.com/mzworthington/agent-lifecycle-kit/main
curl -fsSL "$BASE/install.sh" -o install.sh
curl -fsSL "$BASE/install.sh.sha256" -o install.sh.sha256
echo "$(cat install.sh.sha256)  install.sh" | sha256sum -c -
sh install.sh
```

- [Start here in 10 minutes](/docs/start)
- [Install commands](/docs/start#install)
- [See the before / after](/#proof)
