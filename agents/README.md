# Host agent stubs

Generated thin Cursor/Claude subagent files. Playbooks stay in `skills/<name>/SKILL.md`.

```bash
wk agents generate
wk verify
```

Do not paste SOP or philosophy text here. `wk verify` fails if a stub is stale, fat, or not on the [allowlist](../skills/subagents.yaml).

```bash
wk agents install
```

Install is user-scope (`~/.cursor/agents`, `~/.claude/agents`). It refreshes kit-managed files via `.waykit-managed-agents.json` and leaves custom agents alone. Do not commit `agents/` into a product clone.
