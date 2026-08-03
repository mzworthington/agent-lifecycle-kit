# GitHub MCP

Read and act on GitHub issues, pull requests, and repository metadata from the agent.

## Auth

Export a fine-scoped personal access token before starting Cursor:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
```

Prefer classic or fine-grained tokens limited to the repos you need. Never commit the token; the composed config references `${env:GITHUB_PERSONAL_ACCESS_TOKEN}` only.

## When to use

- Pulling acceptance criteria or bug context from an issue
- Checking PR status / review comments during implementation or audit
- Listing related issues when scoping a feature

## Cursor fragment

Composed from `server.json` → key `github` via `npx -y @modelcontextprotocol/server-github`.
