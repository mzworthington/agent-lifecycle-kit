# Agent Lifecycle Kit

**Consistent, high-quality AI-assisted development across every project.**

AI coding assistants are powerful, but without shared standards they drift: inconsistent architecture, skipped tests, and rework. This kit gives your team one place to define how agents should work: how to spec features, write tests, structure code, and hand off work.

## What you get

- **Shared engineering standards** - hexagonal architecture, domain-driven design, vertical slices, and clean code
- **Lifecycle roles** - spec → TDD → XFN plan → implementation → XFN green → audit → telemetry
- **Behavior catalog & XFN** - tests as source of truth; apply/skip matrix for browser E2E, a11y, security, load ([SOP](./SOPs/behavior-catalog-and-xfn.md))
- **Stack profiles** - TypeScript, Java, C#, .NET, Next.js, Nuxt, Spring Boot, Quarkus, and more (with XFN tooling defaults)
- **Operational playbooks** - SOPs, checklists, and handover templates with per-phase Definition of Done
- **MCP library** - versioned server catalog and profiles composed into Cursor `mcp.json` ([mcps/](./mcps/))
- **Self-improving kit** - local lesson capture and weekly review to promote learnings into shared standards

Works with Cursor and Gemini-style IDEs. Install once on your machine; point any project at it.

## Quick setup

**1. Clone and link**

```bash
git clone https://github.com/mzworthington/agent-lifecycle-kit.git ~/Documents/dev/agent-lifecycle-kit
cd ~/Documents/dev/agent-lifecycle-kit
./install.sh
```

This creates `~/.agents` as a symlink to the clone, copies a local config file, and installs the default MCP profile to `~/.cursor/mcp.json` (skip with `INSTALL_MCP=0 ./install.sh`).

Optional: pull official Cloudflare + Vercel React skills into Cursor user scope (keeps upgrade via `gh skill`):

```bash
INSTALL_EXTERNAL_SKILLS=1 ./install.sh
# or later:
./scripts/sync-external-skills.sh --install
./scripts/sync-external-skills.sh --update
```

**2. Add to a project**

Copy [templates/project-AGENTS.md](./templates/project-AGENTS.md) into your project root as `AGENTS.md` (or add a short handshake that links to `~/.agents`). Agents will pick up the kit automatically.

For project-scoped MCP tools, copy [templates/project-mcp.json](./templates/project-mcp.json) to `.cursor/mcp.json`, or compose a profile:

```bash
mkdir -p .cursor
~/.agents/scripts/compose-mcp.sh project-example -o .cursor/mcp.json
# Optional:
# ~/.agents/scripts/compose-mcp.sh collab --install     # Linear, Notion, Slack
# ~/.agents/scripts/compose-mcp.sh personal --install   # Bitwarden, LinkedIn, Polyglot (local only)
# ~/.agents/scripts/compose-mcp.sh cloud -o .cursor/mcp.json
```

**3. Start working**

Open the project in your IDE. The agent reads [AGENTS.md](./AGENTS.md) (via `~/.agents`) for bootstrap instructions and activates the right skills for your stack and task. Restart Cursor after MCP changes and confirm servers are healthy under **Customize → MCP**.

## Learn more

| Topic | Where |
|-------|-------|
| Coding standards | [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) |
| Skills and roles | [skills/README.md](./skills/README.md) |
| ADRs (project docs) | [skills/agent-adr/SKILL.md](./skills/agent-adr/SKILL.md), [templates/adr.md](./templates/adr.md) → `docs/ADRs/` |
| Official external skills | [skills/external.lock.json](./skills/external.lock.json), [SOPs/external-skills.md](./SOPs/external-skills.md) |
| MCP library | [mcps/README.md](./mcps/README.md), [SOPs/mcp-library.md](./SOPs/mcp-library.md) |
| Kit improvement | [lessons/README.md](./lessons/README.md), [tasks/kit-review.md](./tasks/kit-review.md) |
| Local config | `system/config.json` (created from `config.example.json`) |

## License

[Unlicense](./LICENSE) (public domain).
