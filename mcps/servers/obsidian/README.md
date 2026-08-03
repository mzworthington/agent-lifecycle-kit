# Obsidian MCP

`obsidian-mcp-server` — search, read, and surgically edit notes through Obsidian’s [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin.

## Prerequisites

1. Install and enable the **Local REST API** community plugin (v4–v5.x recommended by the server).
2. In plugin settings, enable **Non-encrypted (HTTP) Server** (default MCP target `http://127.0.0.1:27123`), or set `OBSIDIAN_BASE_URL` for HTTPS.
3. Copy the API key from plugin settings.

```bash
export OBSIDIAN_API_KEY='...'
# Optional HTTPS:
# export OBSIDIAN_BASE_URL='https://127.0.0.1:27124'
```

Obsidian must be running with the plugin active for tools to work.

## When to use

- Pulling specs, meeting notes, or research from your vault into a coding session
- Writing handover / decision notes back into Obsidian
- Searching tags and daily notes during spec/impl

Keep in the `personal` profile — vaults are machine-local and often private.

## Safer defaults

Optionally set `OBSIDIAN_READ_ONLY=true` or path scopes (`OBSIDIAN_READ_PATHS` / `OBSIDIAN_WRITE_PATHS`) in a local override before giving agents write access.
