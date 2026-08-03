# Slack MCP

`@modelcontextprotocol/server-slack` for listing channels, reading history/threads, and posting messages.

## Auth

1. Create a Slack app with bot scopes: `channels:history`, `channels:read`, `chat:write`, `reactions:write`, `users:read`, `users.profile:read`.
2. Install to the workspace and export:

```bash
export SLACK_BOT_TOKEN='xoxb-...'
export SLACK_TEAM_ID='T...'
```

Optional: add `SLACK_CHANNEL_IDS` to the local composed `env` block to limit visible channels.

## When to use

- Pulling incident or design-thread context into a spec
- Posting structured release/handover notes
- Summarizing long channels before implementation

Prefer the `collab` profile; do not put Slack in the global default unless the whole team needs it everywhere.
