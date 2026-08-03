# MCP library

Versioned catalog of [Model Context Protocol](https://modelcontextprotocol.io/) servers for Cursor (and compatible hosts). Same idea as `skills/`: shared definitions live here; machines and projects opt into profiles.

## Layout

```text
mcps/
├── catalog.json              # Index of every server (id, purpose, secrets, phases)
├── profiles/                 # Named sets of server ids to install together
│   ├── default.json          # Everyday kit profile → ~/.cursor/mcp.json
│   ├── collab.json           # Linear + Notion + Slack on top of default
│   ├── devtools.json         # Chrome DevTools + Next.js DevTools + Playwright
│   ├── cloud.json            # Cloudflare API (+ Context7)
│   ├── personal.json         # Bitwarden + LinkedIn + Polyglot + Obsidian (machine-local)
│   ├── lab.json              # Raspberry Pi / home-lab hosts
│   └── project-example.json  # App-repo example
├── servers/<id>/
│   ├── server.json           # Metadata + Cursor mcpServers fragment
│   └── README.md             # Auth, tools overview, when agents should use it
└── README.md                 # This file
```

## Profiles (keep them small)

| Profile | Servers | Install target |
|---------|---------|----------------|
| `default` | context7, github, memory | `~/.cursor/mcp.json` via `install.sh` |
| `collab` | default + linear, notion, slack | Global/project when the team uses those tools |
| `devtools` | chrome-devtools, next-devtools, playwright | Frontend / XFN project config |
| `cloud` | context7, cloudflare | Workers / DNS / R2 work |
| `personal` | bitwarden, linkedin, polyglot, obsidian | **Your machine only** (secrets / vault) |
| `lab` | raspberry-pi | Home-lab SSH to a Pi / SBC |
| `project-example` | context7, github, next-devtools, chrome-devtools, playwright, postgres | App `.cursor/mcp.json` |

Prefer composing **one** profile that matches the work. Extra MCP tools compete for attention and slow agents.

## How it is wired

| Scope | Path | When |
|-------|------|------|
| Global (all projects) | `~/.cursor/mcp.json` | `./install.sh` (or `./scripts/compose-mcp.sh default --install`) |
| Project (one app) | `<repo>/.cursor/mcp.json` | Copy/compose from a profile; see [templates/project-mcp.json](../templates/project-mcp.json) |

```bash
./scripts/compose-mcp.sh default --install
./scripts/compose-mcp.sh collab --install
./scripts/compose-mcp.sh personal --install          # Bitwarden / LinkedIn / Polyglot / Obsidian
./scripts/compose-mcp.sh lab --install               # Raspberry Pi over SSH
./scripts/compose-mcp.sh devtools -o .cursor/mcp.json
./scripts/compose-mcp.sh cloud -o .cursor/mcp.json
./scripts/compose-mcp.sh project-example -o .cursor/mcp.json
```

Secrets never live in this repo. Stdio servers use `${env:VAR}`; Linear/Notion/Cloudflare use Cursor OAuth on first tool use.

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
| chrome-devtools | stdio | none (local Chrome) |
| next-devtools | stdio | none (Next.js 16+ `npm run dev`) |
| cloudflare | http | OAuth |
| linkedin | stdio | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| bitwarden | stdio | `BW_SESSION` (from `bw unlock --raw`) |
| polyglot | stdio | `POLYGLOT_TOKEN` (+ project `.polyglot-mcp.json`) |
| obsidian | stdio | `OBSIDIAN_API_KEY` (Local REST API plugin; Obsidian running) |
| raspberry-pi | stdio | `RASPBERRY_PI_HOST`, `RASPBERRY_PI_USER`, `RASPBERRY_PI_SSH_KEY` |

## Adding a server

Follow [SOPs/mcp-library.md](../SOPs/mcp-library.md).

## Agent guidance

Lifecycle agents should prefer MCP tools when a catalog entry’s `phases` / `triggers` match the task. Prefer the smallest useful set of servers — more tools ≠ better agent behavior. Never load `personal` servers into shared project configs.
