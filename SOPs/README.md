# Standard operating procedures

Procedures agents load **on demand**. Nothing here belongs in always-on context: [AGENTS.md](https://github.com/mzworthington/agent-lifecycle-kit/blob/main/AGENTS.md) routes to a SOP, the agent reads that one file (or a slice of it via the **kit-knowledge** MCP), and the rest stays out of the prompt. See [context budget](./context-budget.md).

Every SOP is published twice: an HTML page for readers and search engines, and the Markdown source at the same path with a `.md` extension.

## Build and test

| SOP | Use it when |
|-----|-------------|
| [Eval-driven development](./eval-driven-development.md) | Changing a prompt, tool schema, or routing rule |
| [EDD production telemetry](./edd-production-telemetry.md) | Turning live agent traces into the next eval case |
| [Behavior catalog and XFN](./behavior-catalog-and-xfn.md) | Aligning functional and cross-functional impact before coding |
| [Hypothesis-driven debugging](./hypothesis-driven-debug.md) | A bug needs runtime evidence, not another guess |
| [Complexity hotspots](./complexity-hotspots.md) | Deciding what to refactor and in which order |

## Contracts and data

| SOP | Use it when |
|-----|-------------|
| [API contracts](./api-contracts.md) | Publishing or consuming an OpenAPI / AsyncAPI contract |
| [Database schema migrations](./db-migration.md) | Changing a schema that is already in production |

## Agent toolchain

| SOP | Use it when |
|-----|-------------|
| [Context budget](./context-budget.md) | Always-on context is too large or a route loads too much |
| [MCP library](./mcp-library.md) | Adding, composing, or installing an MCP profile |
| [External skills](./external-skills.md) | Installing or refreshing vendor skills |

## Ship and operate

| SOP | Use it when |
|-----|-------------|
| [Conventional commits](./conventional-commits.md) | Writing a commit message or PR title |
| [Release checklist](./release.md) | Cutting a tagged release |
| [Cloudflare analytics ops](./cloudflare-analytics-ops.md) | RUM data is missing or wrong |
| [Search visibility](./search-visibility.md) | Publishing the site, or checking how it is indexed |

Skills that load these procedures live in [`skills/`](https://github.com/mzworthington/agent-lifecycle-kit/blob/main/skills/README.md). Public guides are in [docs](../docs/README.md).
