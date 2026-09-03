# Model classes

Vendor-neutral **capability classes** live in [`catalog.yaml`](./catalog.yaml). Host slugs live only under [`hosts/`](./hosts/). Agents resolve class → slug; they do not invent model ids.

| File | Owns |
|------|------|
| `catalog.yaml` | `plan` / `review` / `implement` / `cheap`, phase + skill map |
| `hosts/cursor.yaml` | Cursor Task `model` slugs (the only place to bump when Cursor ships a new id) |
| [SOPs/model-routing.md](../SOPs/model-routing.md) | When to load this catalog, escalate, recommend a parent-chat switch |

```bash
wk model resolve --skill agent-tdd --spec-complete --host cursor
```

Cursor overlay (cost-first): `plan` / `review` / `implement` → `cursor-grok-4.6-medium`; `cheap` → `composer-2.5-fast`. Parent chat for hooks: Composer 2.5 without Fast. Do not default Kimi/GLM/GPT/Opus (Other Models pool).
