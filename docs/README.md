# Public docs

The landing page at [eval-driven-development.dev](https://eval-driven-development.dev/) is the product pitch; these files are the stable URLs for people and agents.

Every page is published twice. `kit site assemble` renders each Markdown file to an HTML page beside it, so `/docs/edd.html` is the canonical, indexable URL and `/docs/edd.md` is the same content as plain Markdown for agents. Links between docs resolve to whichever form you are reading.

| Doc | Who it is for |
|-----|----------------|
| [EDD guide](./edd.md) | Anyone proving agent tool calls (evals, CI, live keys, dataset hygiene) |
| [Jobs for today](./today-jobs.md) | Landing job picker: the five paths on the homepage |
| [What kit gives you](./kit.md) | Operators: context budget, MCP profiles, quality gate, audit |
| [Architecture decisions](./ADRs/README.md) | Why the kit is shaped the way it is |

Agent-facing procedures stay in [`SOPs/`](../SOPs/README.md). Do not duplicate them here; link them.

## The published tree

GitHub Pages serves a curated `site/` tree (`kit site assemble`), not the whole repo: landing HTML, `assets/`, this directory, `SOPs/`, linked eval/MCP/ontology Markdown, and the generated indexes below. Relative links such as [`../SOPs/context-budget.md`](../SOPs/context-budget.md) stay valid in that tree.

| Index | For |
|-------|-----|
| [All pages](https://eval-driven-development.dev/sitemap.html) | Readers and link-following crawlers |
| [sitemap.xml](https://eval-driven-development.dev/sitemap.xml) | Search engines |
| [llms.txt](https://eval-driven-development.dev/llms.txt) | Model crawlers: the short index |
| [llms-full.txt](https://eval-driven-development.dev/llms-full.txt) | Model crawlers: every page in one file |

Procedure for verification and indexing: [search visibility](../SOPs/search-visibility.md).
