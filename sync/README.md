# Synchronized Agent State Cache

This directory holds session cache and index mappings dynamically managed by the agent integration runtime.

## Directory roles

- **Local workspace indexes** (`workspace-index.json` / `ast-map.db`): speeds up file searches and symbol discovery during codebase scanning.
- **Git state cache** (`git-status.json`): retains information about analyzed commits and branch history to prevent repeating audits on unchanged files.
- **Agent short-term memory** (`conversation-context.bin`): local caching of high-density prompts or active conversations to preserve context bounds.

> **Note:** These files are automatically ignored in global and local `.gitignore` rules as they represent transient local caches.

- **Ontology index cache** (`ontology-index.json`): live-derived kit graph used by kit-knowledge; regenerated on demand.

- **Ontology index cache** (`ontology-index.json`): live-derived kit graph for kit-knowledge; regenerated on demand, not committed.
