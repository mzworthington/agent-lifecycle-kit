# Architecture Decision Records

Sparse [MADR](https://adr.github.io/madr/)-style records for choices that are **hard to reverse** or **deliberately off-norm** for this kit.

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](./0001-hexagonal-ddd-vertical-slices-default.md) | Hexagonal + DDD + vertical slices as the default stack | Accepted | 2026-09-01 |
| [0002](./0002-unlicense.md) | Unlicense (public domain dedication) | Accepted | 2026-09-01 |
| [0003](./0003-edd-default-for-agent-contracts.md) | EDD as the default for prompts, MCP tools, and routing | Accepted | 2026-09-01 |
| [0004](./0004-thin-bootstrap-kit-knowledge-one-mcp-profile.md) | Thin bootstrap, kit-knowledge chunks, and one MCP profile per session | Accepted | 2026-09-01 |
| [0005](./0005-live-derived-ontology-memory-allowlist.md) | Live-derived ontology index and typed memory allowlist | Accepted | 2026-09-01 |
| [0006](./0006-vite-markdown-docs-site.md) | Vite app renders public docs from Markdown | Superseded by 0007 | 2026-09-01 |
| [0007](./0007-astro-static-docs-site.md) | Astro emits the public docs site as static HTML | Accepted | 2026-09-02 |
| [0008](./0008-subagent-allowlist.md) | Sparse subagent allowlist instead of one agent per skill | Accepted | 2026-09-04 |

New ADRs: copy [templates/adr.md](../../templates/adr.md) to `docs/ADRs/NNNN-short-title.md`. Prefer not adding an ADR unless the gate in [agent-adr](../../skills/agent-adr/SKILL.md) applies.
