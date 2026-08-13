---
title: MCP library — add, compose, and install
kind: sop
triggers:
  - MCP
  - mcp.json
  - model context protocol
  - compose-mcp
tools:
  - shell
---
# Standard Operating Procedure: MCP library

Use this when adding a server to the kit catalog, composing a Cursor config, or wiring MCPs into a project.

## 1. Decide scope

| Need | Put it in |
|------|-----------|
| Useful across most projects | `mcps/profiles/default.json` (+ global install) |
| Linear / Notion / Slack | `mcps/profiles/collab.json` |
| Chrome / Next / Playwright | `mcps/profiles/devtools.json` or `project-example` |
| Cloudflare / Vercel | `mcps/profiles/cloud.json` |
| Sentry / Slack ops | `mcps/profiles/ops.json` |
| Semgrep security scans | `mcps/profiles/security.json` |
| Figma design context | `mcps/profiles/design.json` |
| Stripe payments | `mcps/profiles/payments.json` |
| Bitwarden / LinkedIn / Polyglot / Obsidian | `mcps/profiles/personal.json` (**machine-local only**) |
| Raspberry Pi / home lab SSH | `mcps/profiles/lab.json` (**machine-local only**) |
| App-specific DB + frontend stack | `project-example` or a custom project `.cursor/mcp.json` |
| Personal-only experiment | Local `~/.cursor/mcp.json` override (do not commit secrets) |

Prefer a **small** enabled set. Extra MCP tools compete for attention and slow agents. Never commit vault sessions or compose `personal` into shared app repos.

## 2. Add a server definition

1. Create `mcps/servers/<id>/server.json` with metadata and a Cursor `mcp` fragment:

```json
{
  "id": "my-server",
  "name": "My Server",
  "summary": "One-line purpose.",
  "homepage": "https://example.com",
  "transport": "stdio",
  "phases": ["impl"],
  "triggers": ["keyword"],
  "requiredEnv": ["MY_API_KEY"],
  "mcp": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "some-mcp-package"],
      "env": {
        "MY_API_KEY": "${env:MY_API_KEY}"
      }
    }
  }
}
```

2. Add `mcps/servers/<id>/README.md` covering auth, when to use, and risks.
3. Register the server in `mcps/catalog.json`.
4. Add the id to the right profile under `mcps/profiles/` (or create a new profile).

**Rules**

- Never commit real tokens; only `${env:NAME}` / OAuth placeholders.
- `mcp` object keys become Cursor `mcpServers` keys — keep them stable and unique.
- Prefer official or well-known packages; note the homepage for audit.

## 3. Compose and install

```bash
# Preview
./scripts/compose-mcp.sh default

# Global Cursor config (backup written if file exists)
./scripts/compose-mcp.sh default --install

# Collab tools (Linear OAuth, Notion OAuth, Slack env tokens)
./scripts/compose-mcp.sh collab --install

# Ops / incident (Sentry OAuth + Slack)
./scripts/compose-mcp.sh ops --install

# Security audit (Semgrep)
./scripts/compose-mcp.sh security -o .cursor/mcp.security.json

# Design / payments (opt-in; tokens or OAuth)
./scripts/compose-mcp.sh design -o .cursor/mcp.design.json
./scripts/compose-mcp.sh payments -o .cursor/mcp.payments.json

# Personal / sensitive (Bitwarden, LinkedIn, Polyglot, Obsidian) — machine only
./scripts/compose-mcp.sh personal --install

# Home lab (Raspberry Pi over SSH) — machine only
./scripts/compose-mcp.sh lab --install

# Project config (Next + Chrome DevTools + Playwright + read-only Postgres)
mkdir -p .cursor
./scripts/compose-mcp.sh project-example -o .cursor/mcp.json
./scripts/compose-mcp.sh cloud -o .cursor/mcp.cloud.json   # optional merge by hand
```

`./install.sh` runs the **default** profile install only. Opt into `collab`, `ops`, `security`, `personal`, `devtools`, and `cloud` explicitly.

## 4. Verify in Cursor

1. Fully restart Cursor (or reload MCP from **Customize → MCP**).
2. Confirm the server shows a healthy/green status.
3. Ask the agent to use a tool from that server on a real task.
4. If auth fails, confirm the env var is set in the environment that launches Cursor (not only an unrelated shell).

## 5. Project handshake

For app repos, keep kit standards via `AGENTS.md` and optionally commit a composed `.cursor/mcp.json` (no secrets) using [templates/project-mcp.json](../templates/project-mcp.json) as a starting point.
