# MCP library

Versioned catalog of [Model Context Protocol](https://modelcontextprotocol.io/) servers for Cursor (and compatible hosts). Same idea as `skills/`: shared definitions live here; machines and projects opt into profiles.

## Layout

```text
mcps/
├── catalog.json              # Index of every server (id, purpose, secrets, phases)
├── profiles/                 # Named sets of server ids to install together
│   ├── default.json          # Everyday kit profile → ~/.cursor/mcp.json
│   └── project-example.json  # Example for app-repo .cursor/mcp.json
├── servers/<id>/
│   ├── server.json           # Metadata + Cursor mcpServers fragment
│   └── README.md             # Auth, tools overview, when agents should use it
└── README.md                 # This file
```

## How it is wired

| Scope | Path | When |
|-------|------|------|
| Global (all projects) | `~/.cursor/mcp.json` | `./install.sh` (or `./scripts/compose-mcp.sh default --install`) |
| Project (one app) | `<repo>/.cursor/mcp.json` | Copy/compose from a profile; see [templates/project-mcp.json](../templates/project-mcp.json) |

Compose merges selected `servers/*/server.json` `mcp` blocks into a valid Cursor config:

```bash
./scripts/compose-mcp.sh default                 # print JSON
./scripts/compose-mcp.sh default --install       # write ~/.cursor/mcp.json (backup first)
./scripts/compose-mcp.sh project-example -o .cursor/mcp.json
```

Secrets never live in this repo. Server entries use `${env:VAR}` (or Cursor OAuth). Document required vars in each server README and in `catalog.json`.

## Adding a server

Follow [SOPs/mcp-library.md](../SOPs/mcp-library.md).

## Agent guidance

Lifecycle agents should prefer MCP tools when a catalog entry’s `phases` / `triggers` match the task (e.g. browser E2E → Playwright MCP). Prefer the smallest useful set of servers — more tools ≠ better agent behavior.
