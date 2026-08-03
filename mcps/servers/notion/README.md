# Notion MCP

Official hosted Notion MCP (`https://mcp.notion.com/mcp`). Preferred over the legacy local `@notionhq/notion-mcp-server` package.

## Auth

OAuth via Cursor on first Notion tool use. No token in git.

## When to use

- Reading PRDs / tech specs before implementation
- Updating project docs or runbooks after a change
- Searching workspace knowledge during spec or handover

Use the `collab` profile (or add to a project `.cursor/mcp.json`) when the team stores specs in Notion.
