# Memory MCP

`@modelcontextprotocol/server-memory` stores entities, relations, and observations in a local knowledge graph.

## Auth / storage

No API keys. The composed config stores the graph at `${userHome}/.agents/sync/mcp-memory.jsonl` (under the kit symlink; `sync/` is gitignored).

## When to use

- Persisting user/project preferences and recurring domain facts
- Carrying glossary or stakeholder notes across sessions without stuffing prompts
- After **spec** and **xfn** handovers: store agreed glossary terms and XFN SLOs (orchestrator / handover DoD) — or record explicit N/A

Safe for the global `default` profile; keep the graph free of secrets.
