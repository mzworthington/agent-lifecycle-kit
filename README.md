# Hexagonal Agent Lifecycle Kit

Opinionated, hexagonal-architecture-first agent configuration for Cursor and Gemini-style IDEs. Ships lifecycle **roles** (spec → TDD → adapter → audit → telemetry), **language profiles**, **framework profiles**, SOPs, and maintenance tasks.

## Should this be the git repo, or live in `dev` with a symlink?

**Make this directory the git repository.** Keep the symlink pattern for local consumption.

```text
~/Documents/dev/agent-lifecycle-kit/   ← git clone (public repo)
~/.agents                              ← symlink → clone (IDE entry point)
```

### Why not symlink the repo root?

| Approach | Pros | Cons |
|----------|------|------|
| **Repo = `.agents` content** (recommended) | Clone path matches mental model; `install.sh` is one command; consumers symlink `~/.agents` | Repo name is unconventional (fine: `agent-lifecycle-kit` with contents at root) |
| **Repo wraps `.agents` subfolder** | Familiar monorepo layout | Extra nesting; symlink must target subpath; harder to document |
| **No symlink; copy on install** | Works on Windows without symlinks | Drift between clone and active config; harder to dogfood |

Your current setup (`Documents/dev/agent-lifecycle-kit` + `~/.agents` symlink) is the right pattern for open source.

### Consumer install

```bash
git clone https://github.com/mzworthington/agent-lifecycle-kit.git ~/.agents
# or clone elsewhere and run:
./install.sh
```

Point project repos at the kit via a thin `AGENTS.md` that links to `~/.agents` (copy from this repo's [AGENTS.md](./AGENTS.md) as a starting point).

## Directory layout

```text
.agents/
├── AGENTS.md              # Handshake for agents entering a consumer project
├── GEMINI.md              # Bootstrap / stack detection / lifecycle routing
├── CODING_PHILOSOPHY.md   # Hexagonal + TDD + security guardrails
├── install.sh             # Creates ~/.agents symlink + local config
├── skills/                # All Cursor-discoverable skills (roles + profiles)
│   ├── agent-*            # Lifecycle role personas
│   ├── lang-*             # Language profiles
│   └── framework-*        # Framework profiles
├── SOPs/                  # Standard operating procedures
├── tasks/                 # Maintenance checklists
├── templates/             # Handover and other templates
├── system/                # Local config (config.json gitignored)
├── sync/                  # Runtime cache (gitignored)
└── handover/              # Per-project phase artifacts (gitignored)
```

## Agents vs skills — naming and balance

Cursor has one discovery mechanism: **`skills/<name>/SKILL.md`**. Splitting `agents/` and `skills/` at the top level would duplicate concepts and break auto-discovery unless you add symlinks.

**Recommended model (implemented here):**

- **`agent-*` skills** = lifecycle **roles** (orchestrator, spec, TDD, …)
- **`lang-*` / `framework-*` skills** = stack **profiles**
- **`SOPs/` and `tasks/`** = procedural docs (not skills unless you promote them)

Balance today: **7 roles + 7 profiles** — appropriate. Roles stay thin (behavior + output schema); stack detail lives in profiles. Add new frameworks/languages as profiles, not roles.

See [skills/README.md](./skills/README.md) for the full taxonomy.

## What not to commit

- `handover/<project>/` — local phase artifacts
- `sync/*` — IDE session cache
- `system/config.json` — machine/project overrides (use `config.example.json`)

## License

MIT — see [LICENSE](./LICENSE).
