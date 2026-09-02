# Docs overview

Public guides for Eval-Driven Development and Agent Lifecycle Kit. Markdown in this directory (plus `SOPs/`, eval write-ups, and MCP/ontology READMEs) is the site. Raw `.md` URLs stay next to the HTML so agents and `llms.txt` do not depend on the SPA.

`pnpm site:dev` runs the docs app. `pnpm --dir web build` then `kit site assemble` writes `site/`.

## Start

| Page | Who it is for |
|------|----------------|
| [Getting started](./start.md) | First install, demo suite, 95% bar |
| [Jobs for today](./jobs.md) | Five concrete jobs, one command each |
| [Common questions](./faq.md) | Install, keys, CI, context budget |

## Practice

| Page | Who it is for |
|------|----------------|
| [EDD guide](./edd.md) | Anyone proving agent tool calls |
| [What kit gives you](./kit.md) | Context budget, MCP profiles, `kit check` |
| [Feature lifecycle](./lifecycle.md) | Grill → spec → TDD → XFN → ship |
| [Kit map](./map.md) | Interactive ontology of skills and SOPs |

## Reference

| Page | Who it is for |
|------|----------------|
| [SOPs](./sops.md) | Agent-facing procedures |
| [ADRs](./ADRs/) | Hard-to-reverse kit decisions |
| [Eval suites](../evals/edd/README.md) | YAML/JSONL layout and drivers |
| [MCP library](../mcps/README.md) | Profiles and servers |
| [Ontology notes](../ontology/README.md) | How the graph is derived |

Independent assessment: [kit value and model-agnostic review](./kit-value-and-model-agnostic-review.md), [review backlog](./kit-review-backlog.md).
