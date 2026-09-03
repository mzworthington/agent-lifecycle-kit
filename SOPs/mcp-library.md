---
title: MCP library - add, compose, and install
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
| Kit SOP / philosophy / handover chunks | `kit-knowledge` on `default` (already) |
| Linear issues / projects | `default` (OAuth; already in that profile) |
| Notion / Slack | `mcps/profiles/collab.json` |
| Chrome / Next / Playwright | `mcps/profiles/devtools.json` or `project-example` |
| Astro docs / GitHub Pages sites | `mcps/profiles/astro.json` |
| Cloudflare / Vercel | `mcps/profiles/cloud.json` |
| Cloudflare RUM / Worker / DNS diagnosis | `mcps/profiles/cloudflare-ops.json` |
| Sentry / Slack ops | `mcps/profiles/ops.json` |
| Semgrep security scans | `mcps/profiles/security.json` |
| Figma design context | `mcps/profiles/design.json` |
| Stripe payments | `mcps/profiles/payments.json` |
| Bitwarden / LinkedIn / Polyglot / Obsidian | `mcps/profiles/personal.json` (**machine-local only**) |
| Raspberry Pi / home lab SSH | `mcps/profiles/lab.json` (**machine-local only**) |
| App-specific DB + frontend stack | `project-example` or a custom project `.cursor/mcp.json` |
| Personal-only experiment | Local `~/.cursor/mcp.json` override (do not commit secrets) |

### Profile discipline (token / attention budget)

1. **One profile per session.** Compose a single named profile into `mcp.json`. Do not merge collab + devtools + ops + personal into one global file.
2. **Match skill `mcp:` frontmatter.** If `agent-xfn` lists `playwright`, use `devtools` or a project profile that includes it - do not enable every catalog server “just in case.”
3. **Skills ≠ MCP.** Role behavior stays in `skills/`. MCP is for live systems, vendor docs, memory, and kit chunk retrieval (`kit-knowledge`).
4. Prefer a **small** enabled set. Extra MCP tools compete for attention and inflate tool-schema tokens. Never commit vault sessions or compose `personal` into shared app repos.

See [SOPs/context-budget.md](./context-budget.md).

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
- `mcp` object keys become Cursor `mcpServers` keys - keep them stable and unique.
- Prefer official or well-known packages; note the homepage for audit.

## 3. Compose and install

```bash
# Preview
kit mcp default

# Global Cursor config (backup written if file exists)
kit mcp default --install

# Collab extras (Notion OAuth, Slack env tokens; Linear is already on default)
kit mcp collab --install

# Ops / incident (Sentry OAuth + Slack)
kit mcp ops --install

# Security audit (Semgrep)
kit mcp security -o .cursor/mcp.security.json

# Design / payments (opt-in; tokens or OAuth)
kit mcp design -o .cursor/mcp.design.json
kit mcp payments -o .cursor/mcp.payments.json

# Personal / sensitive (Bitwarden, LinkedIn, Polyglot, Obsidian) - machine only
kit mcp personal --install

# Home lab (Raspberry Pi over SSH) - machine only
kit mcp lab --install

# Project config (Next + Chrome DevTools + Playwright + read-only Postgres)
mkdir -p .cursor
kit mcp project-example -o .cursor/mcp.json
kit mcp cloud -o .cursor/mcp.cloud.json   # optional merge by hand
kit mcp cloudflare-ops --install          # RUM / Worker diagnosis
```

The installer (`curl | sh` in [Getting started](../docs/start.md), or `./install.sh` from a checkout) runs the **default** profile install only. Opt into `collab`, `ops`, `security`, `personal`, `devtools`, `cloud`, and `cloudflare-ops` explicitly.

## 4. Verify in Cursor

1. Fully restart Cursor (or reload MCP from **Customize → MCP**).
2. Confirm the server shows a healthy/green status.
3. Ask the agent to use a tool from that server on a real task.
4. If auth fails, confirm the env var is set in the environment that launches Cursor (not only an unrelated shell).

## 5. Project handshake

For app repos, keep kit standards via `AGENTS.md` and optionally commit a composed `.cursor/mcp.json` (no secrets) using [templates/project-mcp.json](../templates/project-mcp.json) as a starting point.
