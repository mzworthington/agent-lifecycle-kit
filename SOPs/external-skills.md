---
title: External skills — install and keep up to date
kind: sop
triggers:
  - external skills
  - gh skill
  - Cloudflare skills
  - Vercel react-best-practices
  - official skills
tools:
  - shell
---
# Standard Operating Procedure: External skills

Use this for **official / third-party** Agent Skills (Cloudflare, Vercel, etc.). Do **not** copy those skills into the kit’s committed `skills/` tree.

## Ownership split

| Kind | Location | Update path |
|------|----------|-------------|
| Kit lifecycle / stack skills | `skills/agent-*`, `lang-*`, `framework-*` | PRs in this repo |
| Official upstream skills | Cursor user scope via `gh skill` | `scripts/sync-external-skills.sh` |

Declared list: [skills/external.lock.json](../skills/external.lock.json).

## Prerequisites

- GitHub CLI **v2.90+** with `gh skill` (`gh skill --help`)
- Authenticated `gh` (`gh auth status`)

## Install / refresh

```bash
# Install everything in the lockfile (Cursor --scope user)
./scripts/sync-external-skills.sh --install

# Preview commands
./scripts/sync-external-skills.sh --dry-run

# Pull upstream changes for already-installed skills
./scripts/sync-external-skills.sh --update
```

Optional from bootstrap:

```bash
INSTALL_EXTERNAL_SKILLS=1 ./install.sh
```

## Add a skill to the lockfile

1. Find the upstream: `gh skill search <term>` or the vendor repo (e.g. `cloudflare/skills`, `vercel-labs/agent-skills`).
2. Preview: `gh skill preview OWNER/REPO skills/<name>`.
3. Append an entry to `skills/external.lock.json`:

```json
{
  "id": "short-name",
  "repository": "owner/repo",
  "skill": "skills/short-name",
  "summary": "One line.",
  "pin": null
}
```

Use `"pin": "v1.2.0"` (or a commit SHA) when you need a frozen upgrade. Pinned skills are skipped by `gh skill update` until unpinned.

4. Run `./scripts/sync-external-skills.sh --install --force`.

Prefer the exact path form (`skills/<name>`) so installs skip full-repo discovery.

5. Run `./scripts/verify-skills-layout.sh` to confirm no upstream dirs remain under kit `skills/`.

## Why not vendor into `skills/`?

This kit is symlinked to `~/.agents`. Vendoring upstream skills into `skills/` freezes them in git and mixes ownership with lifecycle roles. `gh skill` writes provenance into frontmatter so upgrades detect real content changes.

## Current defaults

- **Cloudflare:** `cloudflare`, `wrangler`, `workers-best-practices`, `durable-objects`, `agents-sdk` from `cloudflare/skills`
- **Vercel:** `react-best-practices` from `vercel-labs/agent-skills`
