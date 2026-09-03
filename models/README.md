# Model classes

Vendor-neutral **capability classes** live in [`catalog.yaml`](./catalog.yaml). Host slugs live only under [`hosts/`](./hosts/). Agents resolve class → slug; they do not invent model ids.

| File | Owns |
|------|------|
| `catalog.yaml` | `plan` / `review` / `implement` / `cheap`, phase + skill map |
| `hosts/cursor.yaml` | Cursor Task `model` slugs |
| `hosts/claude.yaml` | Claude Code / `claude` CLI aliases (`opus`, `sonnet`, `haiku`) |
| `hosts/copilot.yaml` | GitHub Copilot / VS Code picker ids |
| `hosts/antigravity.yaml` | Antigravity / Gemini CLI (`--host gemini` and `--host agy` alias here) |
| [SOPs/model-routing.md](../SOPs/model-routing.md) | When to load this catalog, escalate, recommend a parent-chat switch |
| [docs/hosts.md](../docs/hosts.md) | MCP and rules files per host |

```bash
wk model resolve --skill agent-tdd --spec-complete --host cursor
wk model resolve --skill agent-tdd --spec-complete --host claude
wk model resolve --skill agent-tdd --spec-complete --host copilot
wk model resolve --skill agent-tdd --spec-complete --host antigravity
```

Cursor overlay (cost-first): `plan` / `review` / `implement` → `cursor-grok-4.6-medium`; `cheap` → `composer-2.5-fast`. Parent chat for hooks: Composer 2.5 without Fast. Do not default Kimi/GLM/GPT/Opus (Other Models pool) **on Cursor**. Other hosts use their own overlays; bump those files when the picker changes.
