# MCP library

Versioned catalog of [Model Context Protocol](https://modelcontextprotocol.io/) servers for Cursor (and compatible hosts). Same idea as `skills/`: shared definitions live here; machines and projects opt into profiles.

## Layout

```text
mcps/
├── catalog.json              # Index of every server (id, purpose, secrets, phases)
├── profiles/                 # Named sets of server ids to install together
│   ├── default.json          # Everyday kit profile → ~/.cursor/mcp.json
│   ├── collab.json           # Linear + Notion + Slack on top of default
│   └── project-example.json  # App-repo example (Playwright + Postgres)
├── servers/<id>/
│   ├── server.json           # Metadata + Cursor mcpServers fragment
│   └── README.md             # Auth, tools overview, when agents should use it
└── README.md                 # This file
```

## Profiles (keep them small)

| Profile | Servers | Install target |
|---------|---------|----------------|
| `default` | context7, github, memory | `~/.cursor/mcp.json` via `install.sh` |
| `collab` | default + linear, notion, slack | Global or project when the team lives in those tools |
| `project-example` | context7, github, playwright, postgres | `<app>/.cursor/mcp.json` |

Prefer composing **one** profile that matches the work. Extra MCP tools compete for attention and slow agents.

## How it is wired

| Scope | Path | When |
|-------|------|------|
| Global (all projects) | `~/.cursor/mcp.json` | `./install.sh` (or `./scripts/compose-mcp.sh default --install`) |
| Project (one app) | `<repo>/.cursor/mcp.json` | Copy/compose from a profile; see [templates/project-mcp.json](../templates/project-mcp.json) |

```bash
./scripts/compose-mcp.sh default                 # print JSON
./scripts/compose-mcp.sh default --install       # write ~/.cursor/mcp.json (backup first)
./scripts/compose-mcp.sh collab --install        # docs + GitHub + memory + Linear/Notion/Slack
./scripts/compose-mcp.sh project-example -o .cursor/mcp.json
```

Secrets never live in this repo. Stdio servers use `${env:VAR}`; Linear/Notion use Cursor OAuth on first tool use.

## Catalog

| Id | Transport | Secrets / auth |
|----|-----------|----------------|
| context7 | stdio | none |
| github | stdio | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| memory | stdio | none (file under `~/.agents/sync/`) |
| linear | http | OAuth |
| notion | http | OAuth |
| slack | stdio | `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID` |
| postgres | stdio | `DATABASE_URL` (read-only / replica) |
| playwright | stdio | none |

## Adding a server

Follow [SOPs/mcp-library.md](../SOPs/mcp-library.md).

## Agent guidance

Lifecycle agents should prefer MCP tools when a catalog entry’s `phases` / `triggers` match the task (e.g. browser E2E → Playwright; schema questions → Postgres). Prefer the smallest useful set of servers — more tools ≠ better agent behavior.
