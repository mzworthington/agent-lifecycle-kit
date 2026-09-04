# Consumer align

`wk align` checks whether an **app repo** still looks like a Waykit consumer: thin handshake, host rule pointers, kit MCP, conventional `commit-msg`. It does not check README or license. That stays [repo doctor](./doctor.md).

It also does not score hexagonal imports or XFN matrices. Those remain `agent-arch-drift` / catalog handovers.

## Commands

```bash
wk align              # this checkout, report only
wk align ../archlens
wk align . --write    # fill missing CLAUDE.md / .cursorrules / Copilot / Gemini / Windsurf pointers
```

`--write` seeds `AGENTS.md` from `templates/project-AGENTS.md` when it is missing, and fills host pointers. It never overwrites `AGENTS.md`. It does not compose MCP. After a miss on kit-knowledge:

```bash
wk mcp default --project
```

Cloudflare, browsers, and other vendor servers stay on a **named** profile. For live Cloudflare work:

```bash
wk mcp cloudflare-ops --project
```

That replaces the project MCP file for the session. Restore `default` when you are done. Do not merge profiles by hand.

## Consumer CI

Product pull requests can run the same report-only check through a reusable workflow. It installs Waykit (MCP compose off) and runs `wk align .`. It does not run `wk doctor` or live EDD.

```yaml
jobs:
  align:
    uses: mzworthington/waykit/.github/workflows/align-consumer.yml@main
```

Pin `kit_ref` (and the `uses:` ref) to a `vX.Y.Z` tag once you want a frozen installer. Optional `working_directory` is the path `wk align` runs in (default `.`).

First adopter: [gpio-build-monitor](https://github.com/mzworthington/gpio-build-monitor) (`align` job on pull requests). Align failures fail that check.

## What it looks for

| Check | Pass when |
|-------|-----------|
| `AGENTS.md` | File exists |
| Budget | `AGENTS.md` ≤ ~8KB |
| No bulk-load | Handshake does not require `CODING_PHILOSOPHY.md` before phase work (or it says do not bulk-read) |
| Kit pointer | Text names `~/.agents` |
| Host pointers | `.cursorrules`, `CLAUDE.md`, `GEMINI.md`, `.windsurfrules`, `.github/copilot-instructions.md` |
| `commit-msg` | Husky, `.githooks`, or `.git/hooks` (enable `.githooks` with `git config core.hooksPath .githooks`) |
| MCP | Project `.cursor/mcp.json` or `.mcp.json` includes `kit-knowledge` |
| Handover home | If handover paths appear, they use this repo’s folder name, not a stale `blueprint` |

## Related

- First-party checkouts that pass this gate: [Used on our own product repos](./used-in.md)
- Handshake write: `wk init . --mcp default --hook`
- Host pointers only: `wk export-rules`
- Community files: `wk doctor`
- Kit merge bar: `wk check` (this repo, not a product clone)
