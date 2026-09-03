# What do I use this for today?

Pick the job in front of you. Each card opens the steps and a command you can copy.

Each heading is `id | title`. The homepage picker and this page share the same source.

## first-hour | I have never installed Waykit

> Fresh machine. Get `wk` on PATH, bootstrap the repo, open the lifecycle.

Get Waykit on PATH, bootstrap the repo, then run the loop that matches the job.

1. **Install** with `curl | sh` (git and Node 22+).
2. **Init** `wk init . --mcp default --hook`.
3. **Read the lifecycle**, then optionally prove routing with the demo eval suite.

```
curl -fsSL https://raw.githubusercontent.com/mzworthington/waykit/main/install.sh | sh
```

- [Start here in 10 minutes](/docs/start)
- [Install commands](/docs/start#install)
- [Feature lifecycle](/docs/lifecycle)

## feature | Starting a product feature

> Need the lifecycle path: grill → spec → TDD short loop → XFN → ship.

Feature work routes through specialist roles so the catalog and XFN rows stay honest. EDD sits in TDD when the change is a prompt or tool schema.

1. **Stress-test the idea** (grilling) until the decision frontier is clear.
2. **Spec** acceptance criteria, then TDD short loop (gear 1 + gear 2). Use EDD when the change is a prompt or tool schema.
3. **Green XFN apply rows**, audit, then release with a conventional PR title.

```
Open the orchestrator skill and follow the phase table in AGENTS.md
```

- [Feature lifecycle](/docs/lifecycle)
- [Orchestrator skill](https://github.com/mzworthington/waykit/blob/main/skills/agent-orchestrator/SKILL.md)
- [How EDD fits](/docs/edd)

## context | Always-on context is too fat

> Rules dumps are eating the window. You want a budget you can fail CI on.

Thin bootstrap stays under about 8KB. Philosophy and SOPs load on demand; CI fails if the budget blows.

1. **Measure** with `wk measure-context`.
2. **Compose one MCP profile** so unused tool schemas stay out of the prompt.
3. **Hold the bar** with `wk check` (includes the context budget).

```
wk measure-context && wk check
```

- [Context budget SOP](/SOPs/context-budget)
- [MCP profiles](/SOPs/mcp-library)
- [Operator guide](/docs/kit)

## wrong-tool | Wrong tool or made-up args

> The agent guessed architecture, skipped the MCP tool, or invented parameters.

Capture the miss as a JSONL case, mock the tool, and assert routing until the agent stops guessing.

1. **Write the case** for the prompt that failed (expected tool + args).
2. **Run** `wk eval run --suite evals/edd/demo.yaml --model scripted`
3. **Read the report**, tighten the schema or prompt, re-run until green.

```
wk eval run --suite evals/edd/demo.yaml --model scripted
```

- [See before / after](/#proof)
- [Walk the failing-eval demo](/#demo)
- [Demo suite](/evals/edd/demo.yaml)

## ci-gate | Gate a prompt or schema change

> You changed system instructions or a tool contract and need a merge bar.

Treat the prompt and MCP schema like code under test. Fail the PR when routing accuracy drops.

1. **Keep the suite next to the change** (start from `evals/edd/demo.yaml`).
2. **Run** `wk eval ci --suite evals/edd/demo.yaml --threshold-routing 95 --out out/reports`
3. **Attach the markdown report** with `wk eval report --format md --out out/reports`.

```
wk eval ci --suite evals/edd/demo.yaml --threshold-routing 95 --out out/reports
```

- [Before / after](/#proof)
- [Example report](/evals/edd/examples/eval-report)
- [10-minute path](/docs/start)

## kit-graph | I changed a skill or SOP

> You edited the kit tree. Check dangling links, then open the live map.

Skills, SOPs, and MCPs are a live graph. You edit the files; `wk ontology check` fails dangling `depends-on` and `mcp:` refs; kit-knowledge walks neighbors. You do not maintain a second catalog.

1. **Put the file** where the kit expects it (skill folder, SOP, catalog server, or eval YAML).
2. **Check** with `wk ontology check` (`wk check` already runs this gate).
3. **Generate** if you need the public map JSON, then open the map.

```
wk ontology check
```

- [Waykit map](/docs/map)
- [Author the Waykit map](/ontology)
- [Operator guide](/docs/kit)

## repo-hygiene | Owned repos missing README or templates

> You want LICENSE, CONTRIBUTING, and GitHub templates on repos you own, not on every clone.

GitHub is the allowlist. `wk doctor` skips forks and checkouts you cannot admin. Report-only until you pass `--write`.

1. **List sources** with `wk doctor --owned` (`gh` must be logged in).
2. **Match local clones** with `--scan` on your dev directory.
3. **Fill gaps** with `--write` (never overwrites README or LICENSE).

```
wk doctor --owned --scan ~/Documents/dev
```

- [Repo doctor](/docs/doctor)
- [Operator guide](/docs/kit)
- [Conventional commits](/SOPs/conventional-commits)
