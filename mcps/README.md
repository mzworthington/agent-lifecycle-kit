# MCP library

Versioned catalog of [Model Context Protocol](https://modelcontextprotocol.io/) servers for Cursor (and compatible hosts). Same idea as `skills/`: shared definitions live here; machines and projects opt into profiles.

## Layout

```text
mcps/
├── catalog.json              # Index of every server (id, purpose, secrets, phases)
├── profiles/                 # Named sets of server ids to install together
│   ├── default.json          # Everyday kit profile → ~/.cursor/mcp.json (includes Linear)
│   ├── collab.json           # Notion + Slack on top of default
│   ├── devtools.json         # Chrome DevTools + Next.js DevTools + Playwright
│   ├── cloud.json            # Cloudflare + Observability + Vercel (+ Context7)
│   ├── astro.json            # Astro Docs MCP + lean kit servers
│   ├── cloudflare-ops.json   # Cloudflare diagnosis (Code Mode + Observability, no Vercel)
│   ├── ops.json              # Sentry + Slack (+ default lean set)
│   ├── security.json         # Semgrep + GitHub
│   ├── design.json           # Figma (token)
│   ├── payments.json         # Stripe (OAuth)
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
| `default` | kit-knowledge, context7, github, memory, linear | `~/.cursor/mcp.json` via `install.sh` |
| `collab` | default + notion, slack | When the team also uses Notion and Slack |
| `devtools` | chrome-devtools, next-devtools, playwright | Frontend / XFN project config |
| `cloud` | context7, cloudflare, cloudflare-observability, vercel | Workers / DNS / R2 / deploy work |
| `astro` | kit-knowledge, github, memory, astro-docs | Astro pages, islands, GitHub Pages |
| `cloudflare-ops` | kit-knowledge, github, memory, cloudflare, cloudflare-observability | Live RUM / Worker / DNS diagnosis and IaC remediations |
| `ops` | kit-knowledge, context7, github, memory, sentry, slack | Debug / incident / telemetry |
| `security` | context7, github, semgrep | Security audit sessions |
| `design` | context7, figma | UI delivery from designs |
| `payments` | context7, stripe | Billing adapter work |
| `personal` | bitwarden, linkedin, polyglot, obsidian | **Your machine only** (secrets / vault) |
| `lab` | raspberry-pi | Home-lab SSH to a Pi / SBC |
| `project-example` | context7, github, next-devtools, chrome-devtools, playwright, postgres | App `.cursor/mcp.json` |

**One profile per session.** Compose **one** profile that matches the work. Do not stack `collab` + `devtools` + `ops` into a single global `mcp.json`. Extra MCP tools compete for attention, inflate tool-schema tokens, and slow agents.

## How it is wired

| Scope | Path | When |
|-------|------|------|
| Global (all projects) | `~/.cursor/mcp.json` | `./install.sh` (or `kit mcp default --install`) |
| Project (one app) | `<repo>/.cursor/mcp.json` | Copy/compose from a profile; see [templates/project-mcp.json](../templates/project-mcp.json) |

```bash
kit mcp default --install
kit mcp collab --install
kit mcp ops --install
kit mcp security -o .cursor/mcp.security.json
kit mcp design -o .cursor/mcp.design.json
kit mcp payments -o .cursor/mcp.payments.json
kit mcp personal --install          # Bitwarden / LinkedIn / Polyglot / Obsidian
kit mcp lab --install               # Raspberry Pi over SSH
kit mcp devtools -o .cursor/mcp.json
kit mcp cloud -o .cursor/mcp.json
kit mcp astro --install             # Astro Docs MCP
kit mcp cloudflare-ops --install    # RUM / Worker / DNS diagnosis
kit mcp project-example -o .cursor/mcp.json
```

Secrets never live in this repo. Stdio servers use `${env:VAR}`; Linear/Notion/Cloudflare/Sentry/Stripe/Vercel use Cursor OAuth on first tool use.

## Catalog

| Id | Transport | Secrets / auth |
|----|-----------|----------------|
| kit-knowledge | stdio | none (reads `KIT_ROOT` / `~/.agents`) |
| astro-docs | http | none |
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
| cloudflare-observability | http | OAuth |
| sentry | http | OAuth |
| semgrep | stdio | none (`uvx semgrep-mcp`; optional `SEMGREP_APP_TOKEN`) |
| stripe | http | OAuth |
| figma | stdio | `FIGMA_API_KEY` |
| vercel | http | OAuth |
| linkedin | stdio | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| bitwarden | stdio | `BW_SESSION` (from `bw unlock --raw`) |
| polyglot | stdio | `POLYGLOT_TOKEN` (+ project `.polyglot-mcp.json`) |
| obsidian | stdio | `OBSIDIAN_API_KEY` (Local REST API plugin; Obsidian running) |
| raspberry-pi | stdio | `RASPBERRY_PI_HOST`, `RASPBERRY_PI_USER`, `RASPBERRY_PI_SSH_KEY` |

## Adding a server

Follow [SOPs/mcp-library.md](../SOPs/mcp-library.md).

## Agent guidance

### What belongs where

| Content | Mechanism |
|---------|-----------|
| Role / phase behavior | Skills (`agent-*`) |
| Architecture invariants | Thin [AGENTS.md](../AGENTS.md); philosophy sections on demand |
| SOP / handover chunks | **kit-knowledge** |
| Cross-session glossary / SLOs | **memory** |
| Vendor API docs | **context7** |
| Linear issues / projects | **linear** (on `default`; OAuth on first use) |
| Live trackers / browsers / cloud | Phase profiles (`collab`, `devtools`, `ops`, …) |

### Discipline

1. Lifecycle agents declare preferred MCP ids in skill frontmatter (`mcp:`). Prefer those servers when a catalog entry’s `phases` / `triggers` match - and only if that server is in the **installed** profile.
2. Prefer the smallest useful set of servers - more tools ≠ better agent behavior.
3. Never load `personal` servers into shared project configs.
4. Do not use MCP to host skill bodies; skills stay progressive-disclosure via Cursor discovery.
5. Context budget: [SOPs/context-budget.md](../SOPs/context-budget.md).
