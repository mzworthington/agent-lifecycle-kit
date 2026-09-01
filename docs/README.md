# Public docs

Markdown on this site is served as-is. The landing page at [eval-driven-development.dev](https://eval-driven-development.dev/) is the human HTML viewer; these files are the stable URLs for people and agents.

GitHub Pages publishes a curated `site/` tree (`kit site assemble`): landing HTML, `assets/`, this directory, `SOPs/`, linked eval/MCP/ontology Markdown, and `llms.txt`. It is not the whole kit repo. Relative links such as [`../SOPs/context-budget.md`](../SOPs/context-budget.md) stay valid in that tree.

| Doc | Who it is for |
|-----|----------------|
| [EDD guide](./edd.md) | Anyone proving agent tool calls (evals, CI, live keys, dataset hygiene) |
| [Jobs for today](./today-jobs.md) | Landing job picker: the five paths on the homepage |
| [What kit gives you](./kit.md) | Operators: context budget, MCP profiles, quality gate, audit |

Agent-facing procedures stay in [`SOPs/`](../SOPs/). Do not duplicate them here; link them.
