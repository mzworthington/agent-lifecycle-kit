# Docs overview

Public guides for Eval-Driven Development and Agent Lifecycle Kit. Markdown in this directory (plus `SOPs/`, eval write-ups, and MCP/ontology READMEs) is the site. Raw `.md` URLs stay next to the HTML so agents and `llms.txt` do not depend on client JavaScript.

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
| [Kit map](./map.md) | Interactive graph of this kit’s skills and SOPs |
| [Author the kit map](../ontology/README.md) | What becomes a node, how to regenerate, what it is not |

## Reference

| Page | Who it is for |
|------|----------------|
| [SOPs](./sops.md) | Agent-facing procedures |
| [ADRs](./ADRs/) | Hard-to-reverse kit decisions |
| [Eval suites](../evals/edd/README.md) | YAML/JSONL layout and drivers |
| [MCP library](../mcps/README.md) | Profiles and servers |
| [Ontology schema](../ontology/schema.yaml) | Metamodel (`phaseOrder`, types, memory allowlist) |

Independent assessment: [kit value and model-agnostic review](./kit-value-and-model-agnostic-review.md), [review backlog](./kit-review-backlog.md).
