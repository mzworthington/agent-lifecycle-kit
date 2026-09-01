# Kit ontology

Hand-maintained metamodel: [`schema.yaml`](./schema.yaml).  
The index is **derived at use time** from the live kit tree (optional cache under `sync/`, not committed).

## Customize for your stack / org

| Knob | File | What to change |
|------|------|----------------|
| Lifecycle phases | `schema.yaml` → `phaseOrder` | Replace grilling/spec/tdd/… with your phases |
| Memory write allowlist | `schema.yaml` → `memoryEntityTypes` | Add/rename types your agents may store |
| Relations / entity kinds | `schema.yaml` → `types`, `relations` | Extend only if you also teach the generator |
| Skills / SOPs / MCPs | `skills/`, `SOPs/`, `mcps/catalog.json` | Index picks them up automatically |
| Eval→skill/MCP edges | suite YAML `ontology.gates` | Declarative ids like `mcp:memory`, `skill:agent-ship` |
| Philosophy / docs | `CODING_PHILOSOPHY.md`, `docs/*.md` | Linked via `§N` and markdown paths |

## Layout the generator expects

These paths are kit conventions (not vendor names):

- `skills/<name>/SKILL.md` (frontmatter: `depends-on`, `mcp`, `phase`)
- `SOPs/*.md`
- `mcps/catalog.json` → `servers[].id`
- `evals/edd/*.yaml` (optional `ontology.gates`)
- `docs/*.md`, `CODING_PHILOSOPHY.md`, `handover/<project>/handover_*.md`

No company or cloud vendor is special-cased in the generator.

## CLI

```bash
kit ontology check      # live-derived referential integrity
kit ontology generate   # dump gitignored sync/ cache and homepage JSON
```

The public site loads `assets/ontology-index.json` (written at generate / Pages deploy, not committed). Filter, labels, and ring layout live in [`kit/src/ontology/graph_view.ts`](../kit/src/ontology/graph_view.ts). The D3 adapter is [`web/src/ontology/map.ts`](../web/src/ontology/map.ts).
