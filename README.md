# Agent Lifecycle Kit

**Consistent, high-quality AI-assisted development across every project.**

AI coding assistants are powerful, but without shared standards they drift: inconsistent architecture, skipped tests, and rework. This kit gives your team one place to define how agents should work: how to spec features, write tests, structure code, and hand off work.

## What you get

- **Shared engineering standards** - hexagonal architecture, domain-driven design, vertical slices, and clean code
- **Lifecycle roles** - spec → TDD → implementation → audit → telemetry, so agents follow a repeatable process
- **Stack profiles** - TypeScript, Java, .NET, Next.js, Nuxt, Spring Boot, Quarkus, and more
- **Operational playbooks** - SOPs, checklists, and handover templates
- **Self-improving kit** - local lesson capture and weekly review to promote learnings into shared standards

Works with Cursor and Gemini-style IDEs. Install once on your machine; point any project at it.

## Quick setup

**1. Clone and link**

```bash
git clone https://github.com/mzworthington/agent-lifecycle-kit.git ~/Documents/dev/agent-lifecycle-kit
cd ~/Documents/dev/agent-lifecycle-kit
./install.sh
```

This creates `~/.agents` as a symlink to the clone and copies a local config file.

**2. Add to a project**

Copy [templates/project-AGENTS.md](./templates/project-AGENTS.md) into your project root as `AGENTS.md` (or add a short handshake that links to `~/.agents`). Agents will pick up the kit automatically.

**3. Start working**

Open the project in your IDE. The agent reads [AGENTS.md](./AGENTS.md) (via `~/.agents`) for bootstrap instructions and activates the right skills for your stack and task.

## Learn more

| Topic | Where |
|-------|-------|
| Coding standards | [CODING_PHILOSOPHY.md](./CODING_PHILOSOPHY.md) |
| Skills and roles | [skills/README.md](./skills/README.md) |
| Kit improvement | [lessons/README.md](./lessons/README.md), [tasks/kit-review.md](./tasks/kit-review.md) |
| Local config | `system/config.json` (created from `config.example.json`) |

## License

[Unlicense](./LICENSE) (public domain).
