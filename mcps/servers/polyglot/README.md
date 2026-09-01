# Polyglot MCP

Infinum `@infinum/polyglot-mcp` - fetch project translations and create keys/values across locales.

## Auth

```bash
export POLYGLOT_TOKEN='...'
```

Add a project-local `.polyglot-mcp.json` with the Polyglot project id (see package docs) in the app repo you open in Cursor.

## When to use

- Syncing or creating translation keys during UI implementation
- Pulling locale maps before i18n-related TDD

Use the `personal` or a project profile when the app uses Infinum Polyglot. This is **not** the unrelated `poly-glot-mcp` code-comment tool.
