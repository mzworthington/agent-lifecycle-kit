# Used on our own product repos

Waykit is the agent lifecycle we run on first-party apps, not a pack that only exists in this kit. Four checkouts currently pass `wk align`: thin `AGENTS.md`, host rule pointers, kit `default` MCP, conventional `commit-msg`.

Open the repo, read `AGENTS.md`, then:

```bash
wk align .
```

Cloudflare stays on a named profile. For live Worker or Pages work: `wk mcp cloudflare-ops --project`, then restore `wk mcp default --project`.

| Product | GitHub | What to look at |
|---------|--------|-----------------|
| ArchLens | [mzworthington/blueprint](https://github.com/mzworthington/blueprint) | Hexagonal `@archlens/core`, TDD for parsers, sparse ADRs. Origin is still named `blueprint`. |
| SteerLens | [mzworthington/steerco](https://github.com/mzworthington/steerco) | In-app docs, Cloudflare Pages, handovers under `steerlens/`. |
| React Cloudflare template | [mzworthington/react-cloudflare-template](https://github.com/mzworthington/react-cloudflare-template) | The handshake `wk init` writes, so clones start aligned. |
| GPIO build monitor | [mzworthington/gpio-build-monitor](https://github.com/mzworthington/gpio-build-monitor) | Python on the Pi, Pulumi + Worker for the public UI. Commit-msg lives in `.githooks/`. |

These are maintainer repos, not a customer logo wall. If a handshake drifts, `wk align` fails the same way `wk doctor` fails missing community files. gpio-build-monitor also runs that check on PRs via the reusable [align-consumer](./align.md#consumer-ci) workflow.

Related: [Consumer align](./align.md), [Repo doctor](./doctor.md), [Hosts](./hosts.md).
